// receipts.js - Скрипт для страницы чеков

document.addEventListener('DOMContentLoaded', () => {
    console.log('Receipts page loaded');
    loadReceipts();
    setupEventListeners();
    setupTestButtons();
});

async function loadReceipts() {
    const container = document.getElementById('receipts-container');
    if (!container) {
        console.error('receipts-container not found!');
        return;
    }

    // Показываем спиннер загрузки
    container.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Загрузка чеков...</p>
        </div>
    `;

    try {
        console.log('Loading receipts from OrderAPI...');
        
        // Получаем заказы из API
        const orders = await OrderAPI.getOrders();
        console.log('Orders received:', orders);
        
        // Очищаем контейнер
        container.innerHTML = '';
        
        if (!orders || orders.length === 0) {
            container.innerHTML = '<p class="no-receipts">У вас еще нет покупок</p>';
            console.log('No orders found');
            return;
        }
        
        // Проверяем, есть ли order_id в URL (новый заказ после оплаты)
        const urlParams = new URLSearchParams(window.location.search);
        const newOrderId = urlParams.get('order_id');
        
        let allReceipts = [];
        
        // Преобразуем заказы в формат для чеков
        allReceipts = orders.map(order => {
            // Создаем стандартизированный объект чека
            const receipt = {
                id: order.id || order.order_id || 0,
                amount: order.amount || 0,
                status: order.status || 'completed',
                date: order.date || new Date().toISOString(),
                items: order.items || [
                    { 
                        name: `Заказ #${order.id || order.order_id || 0}`, 
                        price: order.amount || 0, 
                        quantity: 1 
                    }
                ]
            };
            
            // Если это новый заказ из URL, помечаем его как новый
            if (newOrderId && (receipt.id == newOrderId || receipt.id == newOrderId)) {
                receipt.isNew = true;
                receipt.highlight = true;
            }
            
            return receipt;
        });
        
        console.log('Receipts prepared:', allReceipts);
        
        // Сортируем по дате (новые первыми)
        allReceipts.sort((a, b) => {
            const dateA = new Date(a.date || 0);
            const dateB = new Date(b.date || 0);
            return dateB - dateA;
        });
        
        // Получаем выбранные фильтры
        const dateFilter = document.getElementById('date-filter')?.value || 'all';
        const statusFilter = document.getElementById('status-filter')?.value || 'all';
        
        // Фильтруем чеки
        const filteredReceipts = allReceipts.filter(receipt => {
            // Фильтр по статусу
            if (statusFilter !== 'all' && receipt.status !== statusFilter) {
                return false;
            }
            
            // Фильтр по дате
            if (dateFilter !== 'all') {
                const orderDate = new Date(receipt.date);
                const now = new Date();
                
                if (dateFilter === 'today') {
                    const today = new Date();
                    return orderDate.toDateString() === today.toDateString();
                } else if (dateFilter === 'week') {
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    return orderDate >= weekAgo;
                } else if (dateFilter === 'month') {
                    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    return orderDate >= monthAgo;
                }
            }
            
            return true;
        });
        
        if (filteredReceipts.length === 0) {
            container.innerHTML = '<p class="no-receipts">Чеки не найдены по выбранным фильтрам</p>';
            return;
        }
        
        // Отображаем отфильтрованные чеки
        filteredReceipts.forEach(receipt => {
            const receiptElement = createReceiptCard(receipt);
            container.appendChild(receiptElement);
        });
        
        console.log(`${filteredReceipts.length} receipts displayed`);
        
        // Если был новый заказ, показываем уведомление и убираем параметр из URL
        if (newOrderId) {
            const newReceipt = filteredReceipts.find(r => 
                r.id == newOrderId || r.id == newOrderId
            );
            
            if (newReceipt) {
                showNewOrderNotification(newReceipt);
                
                // Убираем параметр из URL без перезагрузки
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
        
    } catch (error) {
        console.error('Error loading receipts:', error);
        container.innerHTML = `
            <div class="error">
                <p>Ошибка загрузки чеков</p>
                <p style="font-size: 0.8em; color: #666;">${error.message}</p>
                <button onclick="loadMockReceipts()" class="btn btn-secondary" style="margin-top: 10px;">
                    <i class="fas fa-redo"></i> Загрузить тестовые данные
                </button>
            </div>
        `;
    }
}

// Функция для загрузки тестовых данных при ошибке
function loadMockReceipts() {
    const container = document.getElementById('receipts-container');
    if (!container) return;
    
    const mockReceipts = [
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
        },
        {
            id: 1003,
            amount: 12998,
            status: 'completed',
            date: '2024-01-14T19:45:00',
            items: [
                { name: 'Билет на футбольный матч', price: 6499, quantity: 2 }
            ]
        }
    ];
    
    container.innerHTML = '';
    mockReceipts.forEach(receipt => {
        const receiptElement = createReceiptCard(receipt);
        container.appendChild(receiptElement);
    });
    
    alert('Загружены тестовые данные');
}

function createReceiptCard(receipt) {
    const div = document.createElement('div');
    div.className = 'receipt-card';
    if (receipt.highlight) {
        div.classList.add('receipt-highlight');
        div.style.border = '2px solid #4cc9f0';
        div.style.boxShadow = '0 0 10px rgba(76, 201, 240, 0.3)';
    }
    div.dataset.orderId = receipt.id;
    
    const formattedDate = Utils.formatDate ? Utils.formatDate(receipt.date) : new Date(receipt.date).toLocaleDateString('ru-RU');
    const formattedAmount = Utils.formatPrice ? Utils.formatPrice(receipt.amount) : `${receipt.amount} руб.`;
    const ticketCount = receipt.items.reduce((total, item) => total + (item.quantity || 1), 0);
    
    // Добавляем иконку "новый" для свежих заказов
    const isNew = receipt.isNew || (Date.now() - new Date(receipt.date).getTime() < 24 * 60 * 60 * 1000);
    
    div.innerHTML = `
        <div class="receipt-header">
            <div class="receipt-id">
                Заказ #${receipt.id}
                ${isNew ? '<span class="new-badge">НОВЫЙ</span>' : ''}
            </div>
            <div class="status-badge status-${receipt.status}">
                ${getStatusLabel(receipt.status)}
            </div>
        </div>
        
        <div class="receipt-info">
            <div class="info-row">
                <span>Дата:</span>
                <span>${formattedDate}</span>
            </div>
            <div class="info-row">
                <span>Сумма:</span>
                <span>${formattedAmount}</span>
            </div>
            <div class="info-row">
                <span>Кол-во билетов:</span>
                <span>${ticketCount}</span>
            </div>
        </div>
        
        <div class="receipt-actions">
            <button class="btn btn-outline view-details" data-order-id="${receipt.id}">
                <i class="fas fa-eye"></i> Подробнее
            </button>
            <button class="btn btn-secondary print-receipt" data-order-id="${receipt.id}">
                <i class="fas fa-print"></i> Печать
            </button>
        </div>
    `;
    
    return div;
}

function showNewOrderNotification(receipt) {
    const notification = document.createElement('div');
    notification.className = 'new-order-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4cc9f0;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-check-circle" style="font-size: 1.5em;"></i>
            <div>
                <strong>Заказ создан!</strong>
                <div style="font-size: 0.9em;">
                    Номер: #${receipt.id}<br>
                    Сумма: ${Utils.formatPrice ? Utils.formatPrice(receipt.amount) : receipt.amount + ' руб.'}
                </div>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="background: none; border: none; color: white; cursor: pointer; margin-left: 10px;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Автоматически скрываем через 5 секунд
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, 5000);
}

function setupEventListeners() {
    console.log('Setting up receipt listeners...');
    
    // Фильтры
    const dateFilter = document.getElementById('date-filter');
    const statusFilter = document.getElementById('status-filter');
    const refreshBtn = document.getElementById('refresh-receipts');
    
    if (dateFilter) {
        dateFilter.addEventListener('change', loadReceipts);
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', loadReceipts);
    }
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadReceipts);
    }
    
    // Кнопки экспорта
    const exportBtn = document.getElementById('export-receipts');
    const printAllBtn = document.getElementById('print-all');
    
    if (exportBtn) {
        exportBtn.addEventListener('click', exportReceiptsToPDF);
    }
    
    if (printAllBtn) {
        printAllBtn.addEventListener('click', printAllReceipts);
    }
    
    // Кнопка закрытия деталей
    const closeDetailsBtn = document.getElementById('close-details');
    if (closeDetailsBtn) {
        closeDetailsBtn.addEventListener('click', () => {
            document.getElementById('receipt-details').style.display = 'none';
        });
    }
}

function setupTestButtons() {
    // Кнопка тестового создания заказа (только для разработки на localhost)
    const testCreateBtn = document.getElementById('test-create-order');
    if (testCreateBtn && window.location.hostname === 'localhost') {
        testCreateBtn.style.display = 'inline-flex';
        testCreateBtn.addEventListener('click', async () => {
            const amount = Math.floor(Math.random() * 10000) + 1000;
            try {
                const order = await OrderAPI.createOrder(amount);
                alert(`Тестовый заказ #${order.order_id} создан на сумму ${amount} руб.`);
                loadReceipts(); // Перезагружаем список
            } catch (error) {
                console.error('Test order creation failed:', error);
                alert('Ошибка создания тестового заказа');
            }
        });
    }
}

// Делегирование событий для динамически созданных элементов
document.addEventListener('click', (e) => {
    // Просмотр деталей чека
    if (e.target.closest('.view-details')) {
        const orderId = e.target.closest('.view-details').dataset.orderId;
        showReceiptDetails(orderId);
    }
    
    // Печать отдельного чека
    if (e.target.closest('.print-receipt')) {
        const orderId = e.target.closest('.print-receipt').dataset.orderId;
        printReceipt(orderId);
    }
    
    // Печать детального чека
    if (e.target.closest('#print-receipt')) {
        const printable = document.getElementById('printable-receipt');
        if (printable) {
            printElement(printable);
        }
    }
    
    // Отправка на email
    if (e.target.closest('#send-receipt')) {
        sendReceiptByEmail();
    }
    
    // Скачивание PDF
    if (e.target.closest('#download-receipt')) {
        downloadReceiptAsPDF();
    }
});

async function showReceiptDetails(orderId) {
    try {
        console.log('Loading details for order:', orderId);
        
        // Получаем детали заказа
        const orders = await OrderAPI.getOrders();
        console.log('All orders:', orders);
        
        const order = orders.find(o => 
            o.id === parseInt(orderId) || 
            o.order_id === parseInt(orderId)
        );
        
        if (!order) {
            console.error('Order not found:', orderId);
            alert('Чек не найден');
            return;
        }
        
        console.log('Order found:', order);
        
        // Заполняем детали
        document.getElementById('detail-order-id').textContent = order.id || order.order_id || 'N/A';
        document.getElementById('detail-date').textContent = Utils.formatDate ? 
            Utils.formatDate(order.date) : 
            new Date(order.date).toLocaleString('ru-RU');
        
        const statusLabel = getStatusLabel(order.status || 'completed');
        document.getElementById('detail-status').textContent = statusLabel;
        document.getElementById('detail-status').className = `status-badge status-${order.status || 'completed'}`;
        
        // Общая сумма
        const totalAmount = order.amount || 0;
        const fee = Math.round(totalAmount * 0.03);
        const subtotal = totalAmount - fee;
        
        document.getElementById('detail-amount').textContent = Utils.formatPrice ? 
            Utils.formatPrice(subtotal) : `${subtotal} руб.`;
        document.getElementById('detail-fee').textContent = Utils.formatPrice ? 
            Utils.formatPrice(fee) : `${fee} руб.`;
        document.getElementById('detail-total').textContent = Utils.formatPrice ? 
            Utils.formatPrice(totalAmount) : `${totalAmount} руб.`;
        
        // Список билетов
        const itemsContainer = document.getElementById('detail-items');
        itemsContainer.innerHTML = '';
        
        const items = order.items || [
            { 
                name: `Заказ #${order.id || order.order_id || 'N/A'}`, 
                price: totalAmount, 
                quantity: 1 
            }
        ];
        
        items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'summary-item';
            const itemTotal = (item.price || 0) * (item.quantity || 1);
            itemElement.innerHTML = `
                <div>
                    <strong>${item.name || 'Билет'}</strong>
                    <div class="item-details">
                        ${Utils.formatPrice ? Utils.formatPrice(item.price || 0) : `${item.price || 0} руб.`} × ${item.quantity || 1}
                    </div>
                </div>
                <div>
                    <strong>${Utils.formatPrice ? Utils.formatPrice(itemTotal) : `${itemTotal} руб.`}</strong>
                </div>
            `;
            itemsContainer.appendChild(itemElement);
        });
        
        // Генерируем QR код (простая имитация)
        const qrContainer = document.getElementById('receipt-qr');
        qrContainer.innerHTML = `
            <div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                <div style="font-size: 12px; margin-bottom: 10px; color: #666;">QR-код для входа</div>
                <div style="font-family: monospace; font-size: 8px; letter-spacing: 2px; line-height: 8px;">
                    ████████████████████<br>
                    █∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙█<br>
                    █∙████∙████∙████∙∙∙█<br>
                    █∙██∙∙∙██∙∙∙██∙∙∙∙∙█<br>
                    █∙████∙██∙∙∙████∙∙∙█<br>
                    █∙∙∙∙██∙██∙∙∙██∙∙∙∙█<br>
                    █∙████∙████∙████∙∙∙█<br>
                    █∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙∙█<br>
                    ████████████████████
                </div>
                <div style="font-size: 10px; margin-top: 10px; color: #666;">
                    Ticket ID: TKT${(order.id || order.order_id || 0).toString().padStart(6, '0')}
                </div>
            </div>
        `;
        
        // Показываем блок с деталями
        const detailsBlock = document.getElementById('receipt-details');
        detailsBlock.style.display = 'block';
        
        // Прокручиваем к деталям
        detailsBlock.scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('Error loading receipt details:', error);
        alert('Ошибка загрузки деталей чека');
    }
}

function getStatusLabel(status) {
    const labels = {
        completed: 'Завершён',
        pending: 'В обработке',
        cancelled: 'Отменён',
        'completed': 'Завершён',
        'pending': 'В обработке',
        'cancelled': 'Отменён'
    };
    return labels[status] || status || 'Неизвестно';
}

function exportReceiptsToPDF() {
    // В реальном приложении здесь был бы запрос к API для генерации PDF
    alert('Экспорт в PDF выполняется на сервере. Файл будет отправлен на ваш email.');
}

function printAllReceipts() {
    // В реальном приложении здесь была бы генерация объединенного PDF
    alert('Печать всех чеков. Подготовка документа...');
}

function printReceipt(orderId) {
    // В реальном приложении открывалось бы окно печати
    alert(`Печать чека #${orderId}. Настройте параметры печати в диалоговом окне.`);
}

function printElement(element) {
    const originalContents = document.body.innerHTML;
    const printContents = element.innerHTML;
    
    document.body.innerHTML = printContents;
    window.print();
    document.body.innerHTML = originalContents;
    
    // Перезагружаем страницу для восстановления функциональности
    window.location.reload();
}

function downloadReceiptAsPDF() {
    // В реальном приложении здесь был бы запрос к API
    alert('PDF файл будет загружен на ваше устройство.');
}

function sendReceiptByEmail() {
    const email = prompt('Введите email для отправки чека:');
    if (email && validateEmail(email)) {
        alert(`Чек отправлен на ${email}`);
    } else if (email) {
        alert('Пожалуйста, введите корректный email адрес');
    }
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Функции для разработки и отладки
window.loadMockReceipts = loadMockReceipts;
window.showReceiptDetails = showReceiptDetails;
window.clearAllOrders = async () => {
    if (confirm('Очистить все заказы? (только для тестирования)\n\nЭто удалит:\n- Локальные заказы в браузере\n- Заказы на сервере (если доступно)')) {
        // Очищаем локальное хранилище
        localStorage.removeItem('user_orders');
        localStorage.removeItem('order_count');
        localStorage.removeItem('ticketCart');
        
        // Пытаемся очистить заказы на сервере
        try {
            await fetch(`${API_BASE_URL || 'http://localhost:5001'}/orders/clear?secret=test123`, {
                method: 'DELETE'
            });
            console.log('Server orders cleared');
        } catch (e) {
            console.log('Could not clear server orders:', e);
        }
        
        alert('Все заказы очищены');
        loadReceipts(); // Перезагружаем список
    }
};

// Добавляем анимации в CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .receipt-highlight {
        animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
        0% { box-shadow: 0 0 10px rgba(76, 201, 240, 0.3); }
        50% { box-shadow: 0 0 20px rgba(76, 201, 240, 0.6); }
        100% { box-shadow: 0 0 10px rgba(76, 201, 240, 0.3); }
    }
    
    .new-badge {
        display: inline-block;
        background: #f72585;
        color: white;
        font-size: 0.7em;
        padding: 2px 6px;
        border-radius: 10px;
        margin-left: 8px;
        vertical-align: middle;
    }
`;
document.head.appendChild(style);

// Инициализация при загрузке страницы
console.log('Receipts.js initialized');