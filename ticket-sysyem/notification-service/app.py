from flask import Flask
import pika
import json
import os
import time
import logging

# Настраиваем логирование для Notification Service
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] [Notification Service] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Создаем Flask-приложение для Notification Service
app = Flask(__name__)

# Функция для подключения к RabbitMQ с повторными попытками
def connect_to_rabbitmq():
    rabbitmq_host = os.environ.get('RABBITMQ_HOST', 'rabbitmq')  # Имя хоста RabbitMQ
    max_retries = 10  # Максимальное количество попыток подключения
    retry_delay = 5  # Задержка между попытками
    logger.info(f"Попытка подключения к RabbitMQ на {rabbitmq_host}:5672")
    for attempt in range(max_retries):
        try:
            # Устанавливаем соединение с RabbitMQ
            connection = pika.BlockingConnection(pika.ConnectionParameters(host=rabbitmq_host))
            channel = connection.channel()
            # Объявляем очередь payment_queue для получения событий
            channel.queue_declare(queue='payment_queue')
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

# Функция-обработчик сообщений из очереди payment_queue
def callback(ch, method, properties, body):
    message = json.loads(body)
    if message['event_type'] == 'payment_processed':
        # Обрабатываем событие обработки платежа
        order_id = message['payload']['order_id']
        status = message['payload']['status']
        logger.info(f"Получено событие payment_processed: заказ {order_id}, статус: {status}")
        # Имитация отправки уведомления (в реальном приложении здесь может быть отправка email или push)
        logger.info(f"Уведомление: Платеж для заказа {order_id} завершен со статусом {status}")
    else:
        logger.warning(f"Получено неподдерживаемое событие: {message['event_type']}")
    # Подтверждаем обработку сообщения
    ch.basic_ack(delivery_tag=method.delivery_tag)
    logger.info("Сообщение обработано и подтверждено")

# Настраиваем потребление сообщений из очереди payment_queue
channel.basic_consume(queue='payment_queue', on_message_callback=callback)

# Основной запуск приложения
if __name__ == '__main__':
    logger.info("Запуск Notification Service, ожидание сообщений из очереди payment_queue")
    channel.start_consuming()