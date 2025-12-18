document.addEventListener('DOMContentLoaded', () => {
    loadReceipts();
    setupEventListeners();
});

async function loadReceipts() {
    const container = document.getElementById('receipts-container');
    if (!container) return;

    // Показываем спиннер загрузки
    container.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Загрузка чеков...</p>
        </div>
    `;

    try {
        // Получаем заказы из API
        const orders = await OrderAPI.getOrders();
        
        // Очищаем контейнер
        container.innerHTML = '';
        
        if (orders.length === 0) {
            container.innerHTML = '<p class="no-receipts">У вас еще нет покупок</p>';
            return;
        }
        
        // Получаем выбранные фильтры
        const dateFilter = document.getElementById('date-filter')?.value || 'all';
        const statusFilter = document.getElementById('status-filter')?.value || 'all';
        
        // Фильтруем заказы
        const filteredOrders = orders.filter(order => {
            // Фильтр по дате
            const orderDate = new Date(order.date);
            const now = new Date();
            
            if (dateFilter !== 'all') {
                if (dateFilter === 'today') {
                    const today = new Date();
                    if (orderDate.getDate() !== today.getDate() || 
                        orderDate.getMonth() !== today.getMonth() || 
                        orderDate.getFullYear() !== today.getFullYear()) {
                        return false;
                    }
                } else if (dateFilter === 'week') {
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    if (orderDate < weekAgo) {
                        return false;
                    }
                } else if (dateFilter === 'month') {
                    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    if (orderDate < monthAgo) {
                        return false;
                    }
                }
            }
            
            // Фильтр по статусу
            if (statusFilter !== 'all' && order.status !== statusFilter) {
                return false;
            }
            
            return true;
        });
        
        if (filteredOrders.length === 0) {
            container.innerHTML = '<p class="no-receipts">Чеки не найдены по выбранным фильтрам</p>';
            return;
        }
        
        // Отображаем отфильтрованные заказы
        filteredOrders.forEach(order => {
            const receiptElement = createReceiptCard(order);
            container.appendChild(receiptElement);
        });
        
    } catch (error) {
        console.error('Error loading receipts:', error);
        container.innerHTML = '<p class="error">Ошибка загрузки чеков</p>';
    }
}

function createReceiptCard(order) {
    const div = document.createElement('div');
    div.className = 'receipt-card';
    div.dataset.orderId = order.id;
    
    div.innerHTML = `
        <div class="receipt-header">
            <div class="receipt-id">Заказ #${order.id}</div>
            <div class="status-badge status-${order.status}">
                ${getStatusLabel(order.status)}
            </div>
        </div>
        
        <div class="receipt-info">
            <div class="info-row">
                <span>Дата:</span>
                <span>${Utils.formatDate(order.date)}</span>
            </div>
            <div class="info-row">
                <span>Сумма:</span>
                <span>${Utils.formatPrice(order.amount)}</span>
            </div>
            <div class="info-row">
                <span>Кол-во билетов:</span>
                <span>${order.items.reduce((total, item) => total + item.quantity, 0)}</span>
            </div>
        </div>
        
        <div class="receipt-actions">
            <button class="btn btn-outline view-details" data-order-id="${order.id}">
                <i class="fas fa-eye"></i> Подробнее
            </button>
            <button class="btn btn-secondary print-receipt" data-order-id="${order.id}">
                <i class="fas fa-print"></i> Печать
            </button>
        </div>
    `;
    
    return div;
}

function setupEventListeners() {
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
        // Получаем детали заказа
        const orders = await OrderAPI.getOrders();
        const order = orders.find(o => o.id === parseInt(orderId));
        
        if (!order) {
            alert('Чек не найден');
            return;
        }
        
        // Заполняем детали
        document.getElementById('detail-order-id').textContent = order.id;
        document.getElementById('detail-date').textContent = Utils.formatDate(order.date);
        document.getElementById('detail-status').textContent = getStatusLabel(order.status);
        document.getElementById('detail-status').className = `status-badge status-${order.status}`;
        
        // Общая сумма
        const fee = Math.round(order.amount * 0.03);
        const subtotal = order.amount - fee;
        
        document.getElementById('detail-amount').textContent = Utils.formatPrice(subtotal);
        document.getElementById('detail-fee').textContent = Utils.formatPrice(fee);
        document.getElementById('detail-total').textContent = Utils.formatPrice(order.amount);
        
        // Список билетов
        const itemsContainer = document.getElementById('detail-items');
        itemsContainer.innerHTML = '';
        
        order.items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'summary-item';
            itemElement.innerHTML = `
                <div>
                    <strong>${item.name}</strong>
                    <div class="item-details">
                        ${Utils.formatPrice(item.price)} × ${item.quantity}
                    </div>
                </div>
                <div>
                    <strong>${Utils.formatPrice(item.price * item.quantity)}</strong>
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
                    Ticket ID: TKT${order.id.toString().padStart(6, '0')}
                </div>
            </div>
        `;
        
        // Показываем блок с деталями
        document.getElementById('receipt-details').style.display = 'block';
        
        // Прокручиваем к деталям
        document.getElementById('receipt-details').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('Error loading receipt details:', error);
        alert('Ошибка загрузки деталей чека');
    }
}

function getStatusLabel(status) {
    const labels = {
        completed: 'Завершён',
        pending: 'В обработке',
        cancelled: 'Отменён'
    };
    return labels[status] || status;
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