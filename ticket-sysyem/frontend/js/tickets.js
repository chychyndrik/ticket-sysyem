document.addEventListener('DOMContentLoaded', () => {
    loadTickets();
    setupEventListeners();
    renderCart();
});

// Моковые данные билетов
const mockTickets = [
    {
        id: 1,
        name: 'Концерт группы "Кино"',
        price: 2999,
        description: 'Легендарная группа вживую. Тур "Последний герой".',
        category: 'concert',
        image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        date: '2024-02-20 19:00',
        venue: 'Санкт-Петербург, Ледовый дворец',
        available: 150
    },
    {
        id: 2,
        name: 'Спектакль "Вишневый сад"',
        price: 1999,
        description: 'Классическая постановка в МХТ им. Чехова.',
        category: 'theater',
        image: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        date: '2024-02-25 18:30',
        venue: 'Москва, МХТ им. Чехова',
        available: 80
    },
    {
        id: 3,
        name: 'Футбольный матч: Спартак vs Зенит',
        price: 6499,
        description: 'Ключевой матч чемпионата России по футболу.',
        category: 'sport',
        image: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        date: '2024-03-05 20:00',
        venue: 'Москва, Открытие Банк Арена',
        available: 45
    },
    {
        id: 4,
        name: 'Кино: "Дюна 2"',
        price: 2499,
        description: 'Премьера второй части культового фантастического фильма.',
        category: 'cinema',
        image: 'https://images.unsplash.com/photo-1489599809516-9827b6d1cf13?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        date: '2024-02-28 21:00',
        venue: 'Москва, Кинотеатр "Октябрь"',
        available: 200
    },
    {
        id: 5,
        name: 'Концерт "Рамштайн"',
        price: 7999,
        description: 'Немецкая индастриал-метал группа в России.',
        category: 'concert',
        image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        date: '2024-04-15 20:00',
        venue: 'Москва, Лужники',
        available: 25
    },
    {
        id: 6,
        name: 'Балет "Лебединое озеро"',
        price: 3499,
        description: 'Классический балет в постановке Большого театра.',
        category: 'theater',
        image: 'https://images.unsplash.com/photo-1508349937151-22b68c77b9f8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        date: '2024-03-10 19:00',
        venue: 'Москва, Большой театр',
        available: 60
    }
];

function loadTickets() {
    const container = document.getElementById('tickets-container');
    if (!container) return;

    container.innerHTML = '';
    
    mockTickets.forEach(ticket => {
        const ticketElement = createTicketCard(ticket);
        container.appendChild(ticketElement);
    });
}

function createTicketCard(ticket) {
    const div = document.createElement('div');
    div.className = 'ticket-card';
    div.innerHTML = `
        <div class="ticket-image">
            <img src="${ticket.image}" alt="${ticket.name}">
        </div>
        <div class="ticket-content">
            <span class="ticket-category">${getCategoryLabel(ticket.category)}</span>
            <h3 class="ticket-title">${ticket.name}</h3>
            <p class="ticket-description">${ticket.description}</p>
            <div class="ticket-info">
                <p><i class="far fa-calendar"></i> ${formatDate(ticket.date)}</p>
                <p><i class="fas fa-map-marker-alt"></i> ${ticket.venue}</p>
                <p><i class="fas fa-ticket-alt"></i> Осталось мест: ${ticket.available}</p>
            </div>
            <div class="ticket-footer">
                <div class="ticket-price">${Utils.formatPrice(ticket.price)}</div>
                <div class="ticket-actions">
                    <div class="ticket-quantity" data-id="${ticket.id}">
                        <button class="quantity-btn minus" data-action="decrease">-</button>
                        <input type="number" class="quantity-input" value="1" min="1" max="${ticket.available}">
                        <button class="quantity-btn plus" data-action="increase">+</button>
                    </div>
                    <button class="btn btn-primary add-to-cart" data-id="${ticket.id}">
                        <i class="fas fa-cart-plus"></i> В корзину
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return div;
}

function setupEventListeners() {
    // Поиск билетов
    const searchInput = document.getElementById('search-tickets');
    if (searchInput) {
        searchInput.addEventListener('input', Utils.debounce(searchTickets, 300));
    }
    
    // Фильтр категорий
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterTicketsByCategory);
    }
    
    // Кнопка оформления заказа
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            window.location.href = 'payment.html';
        });
    }
}

function searchTickets() {
    const searchTerm = document.getElementById('search-tickets').value.toLowerCase();
    const categoryFilter = document.getElementById('category-filter').value;
    
    const filteredTickets = mockTickets.filter(ticket => {
        const matchesSearch = ticket.name.toLowerCase().includes(searchTerm) ||
                            ticket.description.toLowerCase().includes(searchTerm);
        const matchesCategory = categoryFilter === 'all' || ticket.category === categoryFilter;
        
        return matchesSearch && matchesCategory;
    });
    
    const container = document.getElementById('tickets-container');
    container.innerHTML = '';
    
    if (filteredTickets.length === 0) {
        container.innerHTML = '<p class="no-results">Билеты по вашему запросу не найдены</p>';
        return;
    }
    
    filteredTickets.forEach(ticket => {
        const ticketElement = createTicketCard(ticket);
        container.appendChild(ticketElement);
    });
    
    // Повторно навешиваем обработчики событий
    attachCartEventListeners();
}

function filterTicketsByCategory() {
    searchTickets();
}

function attachCartEventListeners() {
    // Кнопки добавления в корзину
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', (e) => {
            const ticketId = parseInt(e.target.dataset.id || e.target.closest('.add-to-cart').dataset.id);
            const ticket = mockTickets.find(t => t.id === ticketId);
            const quantityInput = document.querySelector(`.ticket-quantity[data-id="${ticketId}"] .quantity-input`);
            const quantity = parseInt(quantityInput.value);
            
            CartAPI.addToCart(ticket, quantity);
            renderCart();
            
            // Анимация добавления
            button.innerHTML = '<i class="fas fa-check"></i> Добавлено';
            button.classList.add('btn-success');
            setTimeout(() => {
                button.innerHTML = '<i class="fas fa-cart-plus"></i> В корзину';
                button.classList.remove('btn-success');
            }, 1000);
        });
    });
    
    // Кнопки изменения количества
    document.querySelectorAll('.quantity-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            const quantityDiv = e.target.closest('.ticket-quantity');
            const input = quantityDiv.querySelector('.quantity-input');
            let value = parseInt(input.value);
            const max = parseInt(input.max);
            
            if (action === 'increase' && value < max) {
                value++;
            } else if (action === 'decrease' && value > 1) {
                value--;
            }
            
            input.value = value;
        });
    });
}

function renderCart() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalElement = document.getElementById('cart-total');
    const cartCountElement = document.getElementById('cart-count');
    
    if (!cartItemsContainer) return;
    
    const cart = CartAPI.getCart();
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-cart">Корзина пуста</p>';
        cartTotalElement.textContent = '0 руб.';
        if (cartCountElement) {
            cartCountElement.textContent = '0';
        }
        return;
    }
    
    cartItemsContainer.innerHTML = '';
    cart.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        itemElement.innerHTML = `
            <div>
                <strong>${item.name}</strong>
                <div class="cart-item-details">
                    ${Utils.formatPrice(item.price)} × ${item.quantity}
                </div>
            </div>
            <div>
                <strong>${Utils.formatPrice(item.price * item.quantity)}</strong>
                <button class="btn-remove" data-id="${item.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        cartItemsContainer.appendChild(itemElement);
    });
    
    // Обновляем итоговую сумму
    const total = CartAPI.getCartTotal();
    cartTotalElement.textContent = Utils.formatPrice(total);
    
    if (cartCountElement) {
        cartCountElement.textContent = CartAPI.getCartCount();
    }
    
    // Обработчики для кнопок удаления
    document.querySelectorAll('.btn-remove').forEach(button => {
        button.addEventListener('click', (e) => {
            const ticketId = parseInt(e.target.closest('.btn-remove').dataset.id);
            CartAPI.removeFromCart(ticketId);
            renderCart();
        });
    });
}

function getCategoryLabel(category) {
    const labels = {
        concert: 'Концерт',
        theater: 'Театр',
        sport: 'Спорт',
        cinema: 'Кино'
    };
    return labels[category] || 'Другое';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Инициализация обработчиков событий для корзины
setTimeout(() => {
    attachCartEventListeners();
}, 100);