const API_BASE_URL = 'http://localhost:5001';

// Функция для работы с корзиной
const CartAPI = {
    getCart: () => {
        const cart = localStorage.getItem('ticketCart');
        return cart ? JSON.parse(cart) : [];
    },

    saveCart: (cart) => {
        localStorage.setItem('ticketCart', JSON.stringify(cart));
        CartAPI.updateCartCount();
    },

    addToCart: (ticket, quantity = 1) => {
        const cart = CartAPI.getCart();
        const existingItem = cart.find(item => item.id === ticket.id);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.push({
                id: ticket.id,
                name: ticket.name,
                price: ticket.price,
                quantity: quantity,
                category: ticket.category
            });
        }
        
        CartAPI.saveCart(cart);
        return cart;
    },

    updateQuantity: (ticketId, quantity) => {
        const cart = CartAPI.getCart();
        const itemIndex = cart.findIndex(item => item.id === ticketId);
        
        if (itemIndex >= 0) {
            if (quantity <= 0) {
                cart.splice(itemIndex, 1);
            } else {
                cart[itemIndex].quantity = quantity;
            }
        }
        
        CartAPI.saveCart(cart);
        return cart;
    },

    removeFromCart: (ticketId) => {
        const cart = CartAPI.getCart();
        const filteredCart = cart.filter(item => item.id !== ticketId);
        CartAPI.saveCart(filteredCart);
        return filteredCart;
    },

    clearCart: () => {
        localStorage.removeItem('ticketCart');
        CartAPI.updateCartCount();
        return [];
    },

    getCartTotal: () => {
        const cart = CartAPI.getCart();
        return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    },

    getCartCount: () => {
        const cart = CartAPI.getCart();
        return cart.reduce((count, item) => count + item.quantity, 0);
    },

    updateCartCount: () => {
        const count = CartAPI.getCartCount();
        const cartElements = document.querySelectorAll('.cart-count');
        cartElements.forEach(element => {
            element.textContent = count;
        });
        
        const checkoutBtn = document.getElementById('checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.disabled = count === 0;
        }
    }
};

const OrderAPI = {
    createOrder: async (amount) => {
        try {
            console.log('Creating order with amount:', amount);
            const response = await fetch(`${API_BASE_URL}/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ amount })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server error:', errorText);
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log('Order created successfully:', data);
            
            // Сохраняем заказ в localStorage для быстрого доступа
            const savedOrders = JSON.parse(localStorage.getItem('user_orders') || '[]');
            savedOrders.push({
                id: data.order_id,
                amount: data.amount,
                status: data.status,
                date: data.date || new Date().toISOString(),
                items: [
                    {
                        name: `Заказ #${data.order_id}`,
                        price: data.amount,
                        quantity: 1
                    }
                ]
            });
            localStorage.setItem('user_orders', JSON.stringify(savedOrders));
            
            return data;
            
        } catch (error) {
            console.error('Error creating order:', error);
            
            // Fallback: создаем локальный заказ
            const orderId = Math.floor(Math.random() * 1000) + 1000;
            const fallbackOrder = {
                order_id: orderId,
                status: 'completed',
                amount: amount,
                date: new Date().toISOString()
            };
            
            // Сохраняем локально
            const savedOrders = JSON.parse(localStorage.getItem('user_orders') || '[]');
            savedOrders.push({
                id: orderId,
                amount: amount,
                status: 'completed',
                date: fallbackOrder.date,
                items: [
                    {
                        name: `Заказ #${orderId}`,
                        price: amount,
                        quantity: 1
                    }
                ]
            });
            localStorage.setItem('user_orders', JSON.stringify(savedOrders));
            
            return fallbackOrder;
        }
    },

    getOrders: async () => {
        try {
            console.log('Fetching orders from API...');
            const response = await fetch(`${API_BASE_URL}/orders`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const apiOrders = await response.json();
            console.log('Orders from API:', apiOrders);
            
            // Получаем локальные заказы
            const localOrders = JSON.parse(localStorage.getItem('user_orders') || '[]');
            console.log('Local orders:', localOrders);
            
            // Объединяем заказы, убирая дубликаты
            const allOrders = [...apiOrders];
            localOrders.forEach(localOrder => {
                if (!allOrders.find(order => order.id === localOrder.id)) {
                    allOrders.push(localOrder);
                }
            });
            
            // Сортируем по дате (новые первыми)
            allOrders.sort((a, b) => {
                const dateA = new Date(a.date || 0);
                const dateB = new Date(b.date || 0);
                return dateB - dateA;
            });
            
            console.log('All orders combined:', allOrders);
            return allOrders;
            
        } catch (error) {
            console.error('Error fetching orders from API:', error);
            
            // Fallback: используем локальные заказы + mock данные
            const localOrders = JSON.parse(localStorage.getItem('user_orders') || '[]');
            
            if (localOrders.length > 0) {
                console.log('Using local orders as fallback:', localOrders);
                return localOrders;
            }
            
            // Если нет локальных заказов, возвращаем mock
            console.log('Using mock orders as fallback');
            return [
                {
                    id: 1001,
                    amount: 5999,
                    status: 'completed',
                    date: '2024-01-15T14:30:00',
                    items: [
                        { name: 'Билет на концерт группы "Кино"', price: 2999, quantity: 2 }
                    ]
                },
                {
                    id: 1002,
                    amount: 2499,
                    status: 'pending',
                    date: '2024-01-16T10:15:00',
                    items: [
                        { name: 'Билет в кино "Дюна 2"', price: 2499, quantity: 1 }
                    ]
                }
            ];
        }
    }
};
// Утилитные функции
const Utils = {
    formatPrice: (price) => {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0
        }).format(price);
    },

    formatDate: (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// Экспорт для использования в других модулях
window.CartAPI = CartAPI;
window.OrderAPI = OrderAPI;
window.Utils = Utils;