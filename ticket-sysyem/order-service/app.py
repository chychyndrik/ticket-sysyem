from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
import pika
import json
import os
import time
import logging

# Настраиваем логирование для Order Service
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] [Order Service] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Создаем Flask-приложение для Order Service
app = Flask(__name__)
# Настраиваем подключение к базе данных SQLite (используется для хранения заказов и событий Outbox)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///orders.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)


# Модель Order: представляет заказ в базе данных
class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)  # Уникальный идентификатор заказа
    amount = db.Column(db.Float, nullable=False)  # Сумма заказа
    status = db.Column(db.String(50), default='pending')  # Статус заказа (по умолчанию 'pending')


# Модель Outbox: используется для паттерна Outbox, чтобы сохранять события перед отправкой в RabbitMQ
class Outbox(db.Model):
    id = db.Column(db.Integer, primary_key=True)  # Уникальный идентификатор события
    event_type = db.Column(db.String(50), nullable=False)  # Тип события (например, 'order_created')
    payload = db.Column(db.Text, nullable=False)  # Данные события в формате JSON
    processed = db.Column(db.Boolean, default=False)  # Флаг, указывающий, отправлено ли событие в очередь


class Ticket(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    price = db.Column(db.Float, nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(50))
    date = db.Column(db.String(50))
    venue = db.Column(db.String(100))
    available = db.Column(db.Integer, default=0)

# Функция для подключения к RabbitMQ с повторными попытками
def connect_to_rabbitmq():
    rabbitmq_host = os.environ.get('RABBITMQ_HOST', 'rabbitmq')  # Имя хоста RabbitMQ из переменной окружения
    max_retries = 10  # Максимальное количество попыток подключения
    retry_delay = 5  # Задержка между попытками в секундах
    logger.info(f"Попытка подключения к RabbitMQ на {rabbitmq_host}:5672")
    for attempt in range(max_retries):
        try:
            # Устанавливаем соединение с RabbitMQ
            connection = pika.BlockingConnection(pika.ConnectionParameters(host=rabbitmq_host))
            channel = connection.channel()
            # Объявляем очередь order_queue для отправки событий
            channel.queue_declare(queue='order_queue')
            logger.info("Успешно подключено к RabbitMQ")
            return connection, channel
        except pika.exceptions.AMQPConnectionError:
            if attempt < max_retries - 1:
                logger.warning(f"Не удалось подключиться к RabbitMQ, повторная попытка через {retry_delay} секунд...")
                time.sleep(retry_delay)
            else:
                logger.error("Не удалось подключиться к RabbitMQ после всех попыток")
                raise Exception("Could not connect to RabbitMQ after multiple attempts")


# Подключаемся к RabbitMQ
connection, channel = connect_to_rabbitmq()


# Функция для публикации события в очередь с использованием паттерна Outbox
def publish_to_queue(event_type, payload):
    with app.app_context():
        # Сохраняем событие в таблицу Outbox перед отправкой в очередь
        logger.info(f"Сохранение события {event_type} в таблицу Outbox: {payload}")
        outbox = Outbox(event_type=event_type, payload=json.dumps(payload))
        db.session.add(outbox)
        db.session.commit()

        # Публикуем событие в очередь RabbitMQ
        logger.info(f"Публикация события {event_type} в очередь order_queue")
        channel.basic_publish(
            exchange='',
            routing_key='order_queue',
            body=json.dumps({'event_type': event_type, 'payload': payload})
        )
        # Обновляем статус события в Outbox как обработанное
        outbox.processed = True
        db.session.commit()
        logger.info(f"Событие {event_type} успешно отправлено и отмечено как обработанное")


# Функция для обработки необработанных событий из Outbox (используется для восстановления после сбоев)
def process_outbox():
    with app.app_context():
        logger.info("Проверка таблицы Outbox на наличие необработанных событий")
        unprocessed = Outbox.query.filter_by(processed=False).all()
        if not unprocessed:
            logger.info("Необработанных событий в Outbox не найдено")
        for event in unprocessed:
            logger.info(f"Обработка события {event.event_type} из Outbox: {event.payload}")
            channel.basic_publish(
                exchange='',
                routing_key='order_queue',
                body=json.dumps({'event_type': event.event_type, 'payload': json.loads(event.payload)})
            )
            event.processed = True
            db.session.commit()
            logger.info(f"Событие {event.event_type} из Outbox отправлено и отмечено как обработанное")


# Эндпоинт для создания нового заказа
@app.route('/orders', methods=['POST'])
def create_order():
    data = request.get_json()
    amount = data.get('amount')
    if not amount:
        logger.error("Ошибка: сумма заказа не указана")
        return jsonify({'error': 'Amount is required'}), 400

    # Создаем новый заказ в базе данных
    logger.info(f"Создание заказа с суммой {amount}")
    order = Order(amount=amount)
    db.session.add(order)
    db.session.commit()

    # Публикуем событие order_created через паттерн Outbox
    logger.info(f"Заказ создан: order_id={order.id}, публикация события")
    publish_to_queue('order_created', {'order_id': order.id, 'amount': order.amount})
    return jsonify({'order_id': order.id, 'status': order.status}), 201

@app.route('/api/tickets', methods=['GET'])
def get_tickets():
    try:
        tickets = Ticket.query.all()
        return jsonify([{
            'id': t.id,
            'name': t.name,
            'price': t.price,
            'description': t.description,
            'category': t.category,
            'date': t.date,
            'venue': t.venue,
            'available': t.available
        } for t in tickets])
    except Exception as e:
        logger.error(f"Error getting tickets: {e}")
        return jsonify({'error': 'Failed to load tickets'}), 500

@app.route('/api/tickets/<int:ticket_id>', methods=['GET'])
def get_ticket(ticket_id):
    try:
        ticket = Ticket.query.get(ticket_id)
        if not ticket:
            return jsonify({'error': 'Ticket not found'}), 404
        
        return jsonify({
            'id': ticket.id,
            'name': ticket.name,
            'price': ticket.price,
            'description': ticket.description,
            'category': ticket.category,
            'date': ticket.date,
            'venue': ticket.venue,
            'available': ticket.available
        })
    except Exception as e:
        logger.error(f"Error getting ticket {ticket_id}: {e}")
        return jsonify({'error': 'Failed to load ticket'}), 500

# Основной запуск приложения
if __name__ == '__main__':
    with app.app_context():
        # Создаем таблицы в базе данных
        logger.info("Инициализация базы данных SQLite")
        db.create_all()
    logger.info("Запуск Order Service на порту 5000")
    app.run(host='0.0.0.0', port=5000)