document.addEventListener('DOMContentLoaded', () => {
    loadOrderSummary();
    setupPaymentForm();
    setupEventListeners();
});

function loadOrderSummary() {
    const cart = CartAPI.getCart();
    const itemsContainer = document.getElementById('order-items');
    const amountElement = document.getElementById('order-amount');
    const feeElement = document.getElementById('order-fee');
    const totalElement = document.getElementById('order-total');
    const payAmountElement = document.getElementById('pay-amount');
    
    if (cart.length === 0) {
        window.location.href = 'index.html';
        return;
    }
    
    itemsContainer.innerHTML = '';
    let subtotal = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        
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
                <strong>${Utils.formatPrice(itemTotal)}</strong>
            </div>
        `;
        itemsContainer.appendChild(itemElement);
    });
    
    const fee = Math.round(subtotal * 0.03); // 3% комиссия
    const total = subtotal + fee;
    
    amountElement.textContent = Utils.formatPrice(subtotal);
    feeElement.textContent = Utils.formatPrice(fee);
    totalElement.textContent = Utils.formatPrice(total);
    payAmountElement.textContent = Utils.formatPrice(total);
}

function setupPaymentForm() {
    const paymentMethodSelect = document.getElementById('payment-method');
    const cardDetails = document.getElementById('card-details');
    const emailField = document.getElementById('email-field');
    const cardNumber = document.getElementById('card-number');
    const cardExpiry = document.getElementById('card-expiry');
    const cardCVV = document.getElementById('card-cvv');
    
    // Обработчик изменения способа оплаты
    paymentMethodSelect.addEventListener('change', () => {
        const method = paymentMethodSelect.value;
        
        // Показываем/скрываем детали карты
        if (method === 'card') {
            cardDetails.style.display = 'block';
            emailField.style.display = 'none';
        } else {
            cardDetails.style.display = 'none';
            emailField.style.display = 'block';
        }
    });
    
    // Форматирование номера карты
    if (cardNumber) {
        cardNumber.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
            let formattedValue = '';
            
            for (let i = 0; i < value.length && i < 16; i++) {
                if (i > 0 && i % 4 === 0) {
                    formattedValue += ' ';
                }
                formattedValue += value[i];
            }
            
            e.target.value = formattedValue;
        });
    }
    
    // Форматирование срока действия
    if (cardExpiry) {
        cardExpiry.addEventListener('input', (e) => {
            let value = e.target.value.replace(/[^0-9]/g, '');
            
            if (value.length >= 2) {
                e.target.value = value.slice(0, 2) + '/' + value.slice(2, 4);
            } else {
                e.target.value = value;
            }
        });
    }
    
    // Ограничение CVV
    if (cardCVV) {
        cardCVV.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 3);
        });
    }
}

function setupEventListeners() {
    const paymentForm = document.getElementById('payment-form');
    const termsCheckbox = document.getElementById('terms');
    const termsError = document.getElementById('terms-error');
    
    // Валидация checkbox
    if (termsCheckbox) {
        termsCheckbox.addEventListener('change', () => {
            termsError.textContent = '';
        });
    }
    
    // Обработка отправки формы
    if (paymentForm) {
        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Валидация согласия с условиями
            if (!termsCheckbox.checked) {
                termsError.textContent = 'Необходимо согласиться с условиями';
                return;
            }
            
            // Валидация данных карты, если выбран этот способ
            const paymentMethod = document.getElementById('payment-method').value;
            
            if (paymentMethod === 'card') {
                const cardNumber = document.getElementById('card-number').value.replace(/\s/g, '');
                const cardExpiry = document.getElementById('card-expiry').value;
                const cardCVV = document.getElementById('card-cvv').value;
                
                if (cardNumber.length !== 16) {
                    alert('Номер карты должен содержать 16 цифр');
                    return;
                }
                
                if (!cardExpiry.match(/^\d{2}\/\d{2}$/)) {
                    alert('Введите срок действия в формате ММ/ГГ');
                    return;
                }
                
                if (cardCVV.length !== 3) {
                    alert('CVV код должен содержать 3 цифры');
                    return;
                }
            }
            
            // Получаем сумму заказа
            const cartTotal = CartAPI.getCartTotal();
            const fee = Math.round(cartTotal * 0.03);
            const totalAmount = cartTotal + fee;
            
            // Показываем индикатор загрузки
            const payBtn = document.getElementById('pay-btn');
            const originalText = payBtn.innerHTML;
            payBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Обработка платежа...';
            payBtn.disabled = true;
            
            try {
                // Создаем заказ через API
                const orderData = await OrderAPI.createOrder(totalAmount);
                
                // Имитация обработки платежа
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Очищаем корзину
                CartAPI.clearCart();
                
                // Перенаправляем на страницу с чеком
                window.location.href = `receipt.html?order_id=${orderData.order_id}`;
                
            } catch (error) {
                console.error('Payment error:', error);
                alert('Произошла ошибка при обработке платежа. Пожалуйста, попробуйте еще раз.');
                
                // Восстанавливаем кнопку
                payBtn.innerHTML = originalText;
                payBtn.disabled = false;
            }
        });
    }
}

// Валидация email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Инициализация маски для номера карты
function initializeCardMask() {
    const cardNumberInput = document.getElementById('card-number');
    if (cardNumberInput) {
        cardNumberInput.addEventListener('keydown', (e) => {
            // Разрешаем: backspace, delete, tab, escape, enter
            if ([46, 8, 9, 27, 13].indexOf(e.keyCode) !== -1 ||
                // Разрешаем: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
                (e.keyCode === 65 && e.ctrlKey === true) ||
                (e.keyCode === 67 && e.ctrlKey === true) ||
                (e.keyCode === 86 && e.ctrlKey === true) ||
                (e.keyCode === 88 && e.ctrlKey === true) ||
                // Разрешаем: home, end, left, right
                (e.keyCode >= 35 && e.keyCode <= 39)) {
                return;
            }
            
            // Запрещаем все, кроме цифр
            if ((e.keyCode < 48 || e.keyCode > 57) && (e.keyCode < 96 || e.keyCode > 105)) {
                e.preventDefault();
            }
        });
    }
}

// Вызываем инициализацию масок
initializeCardMask();