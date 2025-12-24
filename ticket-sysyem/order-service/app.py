from flask import Flask, request, jsonify
import logging
import json
import os
from datetime import datetime

# Настраиваем логирование
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [Order Service] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Создаем Flask-приложение
app = Flask(__name__)

# Файл для сохранения заказов
ORDERS_FILE = 'orders.json'

def load_orders():
    """Загружает заказы из файла"""
    try:
        if os.path.exists(ORDERS_FILE):
            with open(ORDERS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        logger.error(f"Error loading orders: {e}")
    return []

def save_orders(orders):
    """Сохраняет заказы в файл"""
    try:
        with open(ORDERS_FILE, 'w', encoding='utf-8') as f:
            json.dump(orders, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Error saving orders: {e}")

# Загружаем существующие заказы при старте
orders_db = load_orders()
order_counter = max([order.get('id', 1000) for order in orders_db], default=1000)

# Эндпоинт для проверки здоровья
@app.route('/health', methods=['GET'])
def health_check():
    logger.info("Health check request received")
    return jsonify({
        'status': 'healthy',
        'service': 'order-service',
        'order_count': len(orders_db),
        'version': '1.0.0'
    })

# Эндпоинт для создания заказа
@app.route('/orders', methods=['POST', 'OPTIONS'])
def create_order():
    if request.method == 'OPTIONS':
        # CORS preflight
        return '', 200
    
    try:
        data = request.get_json()
        logger.info(f"Create order request: {data}")
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        amount = data.get('amount')
        if amount is None:
            return jsonify({'error': 'Amount is required'}), 400
        
        # Преобразуем в число
        try:
            amount = float(amount)
        except ValueError:
            return jsonify({'error': 'Amount must be a number'}), 400
        
        global order_counter
        order_counter += 1
        
        # Создаем новый заказ
        order = {
            'id': order_counter,
            'amount': amount,
            'status': 'completed',
            'date': datetime.now().isoformat(),
            'items': [
                {
                    'name': f'Заказ #{order_counter}',
                    'price': amount,
                    'quantity': 1
                }
            ]
        }
        
        # Добавляем в базу и сохраняем
        orders_db.append(order)
        save_orders(orders_db)
        
        logger.info(f"Order created: {order}")
        
        return jsonify({
            'order_id': order['id'],
            'status': order['status'],
            'amount': order['amount'],
            'date': order['date']
        }), 201
        
    except Exception as e:
        logger.error(f"Error creating order: {e}")
        return jsonify({'error': str(e)}), 500

# Эндпоинт для получения всех заказов
@app.route('/orders', methods=['GET'])
def get_orders():
    logger.info(f"Get all orders request. Total orders: {len(orders_db)}")
    
    # Добавляем mock данные, если база пуста
    if len(orders_db) == 0:
        mock_orders = [
            {
                'id': 1001,
                'amount': 5999.0,
                'status': 'completed',
                'date': '2024-01-15T14:30:00',
                'items': [
                    {'name': 'Билет на концерт группы "Кино"', 'price': 2999.0, 'quantity': 2}
                ]
            },
            {
                'id': 1002,
                'amount': 2499.0,
                'status': 'pending',
                'date': '2024-01-16T10:15:00',
                'items': [
                    {'name': 'Билет в кино "Дюна 2"', 'price': 2499.0, 'quantity': 1}
                ]
            }
        ]
        orders_db.extend(mock_orders)
        save_orders(orders_db)
    
    return jsonify(orders_db)

# Эндпоинт для получения конкретного заказа
@app.route('/orders/<int:order_id>', methods=['GET'])
def get_order(order_id):
    logger.info(f"Get order request: {order_id}")
    order = next((o for o in orders_db if o['id'] == order_id), None)
    if order:
        return jsonify(order)
    return jsonify({'error': 'Order not found'}), 404

# Эндпоинт для очистки всех заказов (только для тестирования)
@app.route('/orders/clear', methods=['DELETE'])
def clear_orders():
    if request.args.get('secret') != 'test123':
        return jsonify({'error': 'Unauthorized'}), 403
    
    global orders_db
    orders_db = []
    save_orders(orders_db)
    
    return jsonify({'message': 'All orders cleared'})

# Корневой эндпоинт
@app.route('/')
def index():
    return jsonify({
        'service': 'Order Service',
        'endpoints': {
            'GET /health': 'Health check',
            'POST /orders': 'Create new order',
            'GET /orders': 'Get all orders',
            'GET /orders/<id>': 'Get specific order',
            'DELETE /orders/clear?secret=test123': 'Clear all orders (test only)'
        },
        'stats': {
            'total_orders': len(orders_db),
            'last_order_id': order_counter
        }
    })

# Запуск приложения
if __name__ == '__main__':
    logger.info(f"Starting Order Service on port 5000. Loaded {len(orders_db)} orders.")
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True
    )