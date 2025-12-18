const API_BASE_URL = 'http://localhost:5001/api';

// Функция для работы с корзиной
const CartAPI = {
    getCart: () => {
        return JSON.parse(localStorage.getItem('ticketCart')) || [];
    },

    saveCart: (cart) => {
        localStorage.setItem('ticketCart', JSON.stringify(cart));
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
        CartAPI.updateCartCount();
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
        CartAPI.updateCartCount();
        return cart;
    },

    removeFromCart: (ticketId) => {
        const cart = CartAPI.getCart();
        const filteredCart = cart.filter(item => item.id !== ticketId);
        CartAPI.saveCart(filteredCart);
        CartAPI.updateCartCount();
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

// Функция для работы с API заказов
const OrderAPI = {
    createOrder: async (amount) => {
        try {
            const response = await fetch(`${API_BASE_URL}/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ amount })
            });
            
            if (!response.ok) {
                throw new Error('Ошибка при создании заказа');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error creating order:', error);
            throw error;
        }
    },

    getOrders: async () => {
        try {
            // В реальном приложении здесь был бы запрос к API
            // Для демо возвращаем моковые данные
            const mockOrders = [
                {
                    id: 1001,
                    amount: 5999,
                    status: 'completed',
                    date: '2024-01-15 14:30:00',
                    items: [
                        { name: 'Билет на концерт группы "Кино"', price: 2999, quantity: 2 }
                    ]
                },
                {
                    id: 1002,
                    amount: 2499,
                    status: 'pending',
                    date: '2024-01-16 10:15:00',
                    items: [
                        { name: 'Билет в кино "Дюна 2"', price: 2499, quantity: 1 }
                    ]
                },
                {
                    id: 1003,
                    amount: 12998,
                    status: 'completed',
                    date: '2024-01-14 19:45:00',
                    items: [
                        { name: 'Билет на футбольный матч', price: 6499, quantity: 2 }
                    ]
                }
            ];
            
            return mockOrders;
        } catch (error) {
            console.error('Error fetching orders:', error);
            return [];
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

// Инициализация темы
const ThemeManager = {
    init: () => {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        const themeToggle = document.querySelector('.theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', ThemeManager.toggleTheme);
        }
    },

    toggleTheme: () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }
};

// Инициализация меню
const MenuManager = {
    init: () => {
        const menuToggle = document.querySelector('.menu-toggle');
        const navMenu = document.querySelector('.nav-menu');
        
        if (menuToggle && navMenu) {
            menuToggle.addEventListener('click', () => {
                navMenu.classList.toggle('active');
            });
            
            // Закрытие меню при клике на ссылку
            const navLinks = navMenu.querySelectorAll('a');
            navLinks.forEach(link => {
                link.addEventListener('click', () => {
                    navMenu.classList.remove('active');
                });
            });
        }
    }
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
    MenuManager.init();
    CartAPI.updateCartCount();
});

// Экспорт для использования в других модулях
window.CartAPI = CartAPI;
window.OrderAPI = OrderAPI;
window.Utils = Utils;