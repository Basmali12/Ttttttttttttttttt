// --- المتغيرات العامة ---
let products = [];
let customers = [];
let invoices = [];
let currentCart = [];
let lastInvoice = null;
let currentSettings = { name: '', phone: '' };

// الاستماع لحدث جاهزية قاعدة البيانات
window.addEventListener('firebaseReady', () => {
    loadData();
    loadSettings();
});

// --- 1. إدارة البيانات (Firebase + Local) ---
function loadData() {
    // جلب السلع
    window.onSnapshot(window.collection(window.db, "products"), (snapshot) => {
        products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderProducts();
        updateSaleDatalists();
    });

    // جلب الزبائن
    window.onSnapshot(window.collection(window.db, "customers"), (snapshot) => {
        customers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderCustomers();
        renderRecordsCustomers();
        updateSaleDatalists();
    });

    // جلب الفواتير
    window.onSnapshot(window.collection(window.db, "invoices"), (snapshot) => {
        invoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // الفرز حسب التاريخ
        invoices.sort((a, b) => new Date(b.date) - new Date(a.date));
    });
}

function loadSettings() {
    const saved = localStorage.getItem('shopSettings');
    if(saved) {
        currentSettings = JSON.parse(saved);
        document.getElementById('shopName').value = currentSettings.name;
        document.getElementById('shopPhone').value = currentSettings.phone;
    }
}

// --- 2. التنقل ---
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    event.target.classList.add('active');
}

// --- 3. تبويبة السلع ---
async function addProduct() {
    const name = document.getElementById('prodName').value;
    const price = parseFloat(document.getElementById('prodPrice').value);
    const qty = parseInt(document.getElementById('prodQty').value);

    if (name && price && qty) {
        await window.addDoc(window.collection(window.db, "products"), {
            name, price, qty, createdAt: new Date().toISOString()
        });
        document.getElementById('prodName').value = '';
        document.getElementById('prodPrice').value = '';
        document.getElementById('prodQty').value = '';
        alert('تمت الإضافة');
    } else {
        alert('املأ الحقول');
    }
}

function renderProducts() {
    const list = document.getElementById('productsList');
    list.innerHTML = products.map(p => `
        <div class="list-item">
            <span>${p.name} - ${p.price} (العدد: ${p.qty})</span>
            <button class="delete-btn" onclick="deleteItem('products', '${p.id}')">حذف</button>
        </div>
    `).join('');
}

// --- 4. تبويبة الزبائن ---
async function addCustomer() {
    const name = document.getElementById('custName').value;
    const phone = document.getElementById('custPhone').value;
    const address = document.getElementById('custAddress').value;

    if (name && phone) {
        await window.addDoc(window.collection(window.db, "customers"), {
            name, phone, address, createdAt: new Date().toISOString()
        });
        document.getElementById('custName').value = '';
        document.getElementById('custPhone').value = '';
        document.getElementById('custAddress').value = '';
        alert('تمت إضافة الزبون');
    } else {
        alert('الاسم والهاتف مطلوبان');
    }
}

function renderCustomers() {
    const search = document.getElementById('custSearch').value.toLowerCase();
    const list = document.getElementById('customersList');
    const filtered = customers.filter(c => c.name.toLowerCase().includes(search));
    list.innerHTML = filtered.map(c => `
        <div class="list-item">
            <span>${c.name} (${c.phone})</span>
            <button class="delete-btn" onclick="deleteItem('customers', '${c.id}')">حذف</button>
        </div>
    `).join('');
}

async function deleteItem(col, id) {
    if(confirm('هل أنت متأكد من الحذف؟')) {
        await window.deleteDoc(window.doc(window.db, col, id));
    }
}

// --- 5. تبويبة البيع (التعديلات الرئيسية) ---

// تحديث القوائم (Datalist) للفهرسة والبحث
function updateSaleDatalists() {
    const custDL = document.getElementById('custDataList');
    custDL.innerHTML = customers.map(c => `<option value="${c.name}" data-id="${c.id}"></option>`).join('');

    const prodDL = document.getElementById('prodDataList');
    prodDL.innerHTML = products.map(p => `<option value="${p.name}"></option>`).join('');
}

// اختيار الزبون من البحث
function selectCustomerFromSearch() {
    const val = document.getElementById('saleCustSearch').value;
    const customer = customers.find(c => c.name === val);
    if(customer) {
        document.getElementById('selectedCustId').value = customer.id;
    } else {
        document.getElementById('selectedCustId').value = '';
    }
}

// التعديل الثاني: فحص المخزون وإظهار الباقي
function checkProductStock() {
    const val = document.getElementById('saleProdSearch').value;
    const product = products.find(p => p.name === val);
    const stockDisplay = document.getElementById('stockDisplay');
    const stockVal = document.getElementById('currentStockVal');

    if(product) {
        stockDisplay.style.display = 'block';
        stockVal.innerText = product.qty;
    } else {
        stockDisplay.style.display = 'none';
    }
}

function addToCart() {
    const prodName = document.getElementById('saleProdSearch').value;
    const qtyInput = document.getElementById('saleQty');
    const requestQty = parseInt(qtyInput.value);

    const product = products.find(p => p.name === prodName);

    if (!product) {
        alert("يرجى اختيار سلعة صحيحة من القائمة");
        return;
    }

    // التحقق من الكمية
    if (requestQty > product.qty) {
        alert(`المخزون لا يكفي! المتاح فقط: ${product.qty} قلل العدد.`);
        qtyInput.value = product.qty; // تعديل تلقائي للحد الأقصى
        return;
    }

    const total = product.price * requestQty;
    
    currentCart.push({ 
        prodId: product.id, 
        name: product.name, 
        price: product.price, 
        qty: requestQty, 
        total: total 
    });

    renderCart();
    // تفريغ الحقول
    document.getElementById('saleProdSearch').value = '';
    document.getElementById('stockDisplay').style.display = 'none';
    qtyInput.value = 1;
}

function renderCart() {
    const cartDiv = document.getElementById('cartItems');
    let grandTotal = 0;
    
    cartDiv.innerHTML = currentCart.map((item, idx) => {
        grandTotal += item.total;
        return `<div style="display:flex; justify-content:space-between; font-size:0.9em; margin-bottom:5px;">
            <span>${item.name} x${item.qty}</span>
            <span>${item.total}</span>
            <span style="color:red; cursor:pointer" onclick="removeFromCart(${idx})">x</span>
        </div>`;
    }).join('');

    document.getElementById('cartTotal').innerText = grandTotal;
}

function removeFromCart(idx) {
    currentCart.splice(idx, 1);
    renderCart();
}

async function checkout() {
    const custId = document.getElementById('selectedCustId').value;
    const paid = parseFloat(document.getElementById('amountPaid').value) || 0;
    const total = parseFloat(document.getElementById('cartTotal').innerText);

    if (!custId || currentCart.length === 0) {
        alert("تأكد من اختيار زبون صحيح وإضافة سلع");
        return;
    }

    // خصم المخزون
    for (let item of currentCart) {
        const product = products.find(p => p.id === item.prodId);
        if(product) {
            await window.updateDoc(window.doc(window.db, "products", product.id), {
                qty: product.qty - item.qty
            });
        }
    }

    const remaining = total - paid;
    
    const invoice = {
        date: new Date().toISOString(),
        custId: custId,
        items: [...currentCart],
        total: total,
        paid: paid,
        remaining: remaining
    };

    const docRef = await window.addDoc(window.collection(window.db, "invoices"), invoice);
    
    // إضافة المعرف للفاتورة المحلية
    invoice.id = docRef.id;
    lastInvoice = invoice;

    currentCart = [];
    renderCart();
    document.getElementById('amountPaid').value = '';
    document.getElementById('saleCustSearch').value = '';
    
    showInvoiceModal(invoice);
}

// --- 6. تبويبة السجلات (التعديل الرابع) ---
function renderRecordsCustomers() {
    const search = document.getElementById('recordSearch').value.toLowerCase();
    const container = document.getElementById('recordsListContainer');
    
    const filteredCusts = customers.filter(c => c.name.toLowerCase().includes(search));

    container.innerHTML = filteredCusts.map(c => {
        // حساب الديون لهذا الزبون
        const custInvoices = invoices.filter(inv => inv.custId === c.id);
        let debt = 0;
        custInvoices.forEach(inv => debt += (inv.remaining || 0));

        return `
        <div class="list-item" onclick="openCustomerRecords('${c.id}')" style="cursor:pointer">
            <div>
                <strong>${c.name}</strong>
            </div>
            <div style="text-align:left">
                <span style="color:${debt > 0 ? '#ff416c' : '#4caf50'}">الديون: ${debt}</span>
            </div>
        </div>`;
    }).join('');
}

let currentRecordCustId = null;

function openCustomerRecords(custId) {
    currentRecordCustId = custId;
    const customer = customers.find(c => c.id === custId);
    const custInvoices = invoices.filter(inv => inv.custId === custId).sort((a,b) => new Date(b.date) - new Date(a.date));
    
    // إخفاء القائمة وإظهار التفاصيل
    document.getElementById('recordsCustomerList').style.display = 'none';
    document.getElementById('customerRecordsDetail').style.display = 'block';

    document.getElementById('recCustName').innerText = `سجل: ${customer.name}`;
    
    updateCustomerDebtDisplay(custId);

    const invoicesHtml = custInvoices.map(inv => {
        const isPayment = inv.items.length === 0; // إذا كانت فاتورة تسديد فقط
        return `
        <div style="border:1px solid rgba(255,255,255,0.2); padding:10px; margin-bottom:10px; border-radius:5px; background:rgba(0,0,0,0.1)">
            <div style="display:flex; justify-content:space-between">
                <span>${new Date(inv.date).toLocaleDateString()}</span>
                <span style="font-weight:bold">${isPayment ? 'تسديد دين' : 'فاتورة بيع'}</span>
            </div>
            ${!isPayment ? `<small>المواد: ${inv.items.map(i=>i.name).join(', ')}</small><br>` : ''}
            <div style="display:flex; justify-content:space-between; margin-top:5px; font-size:0.9em">
                <span>المبلغ: ${inv.total}</span>
                <span>واصل: ${inv.paid}</span>
                <span style="color:${inv.remaining > 0 ? '#ff416c' : '#4caf50'}">باقي: ${inv.remaining}</span>
            </div>
            <button class="action-btn" style="padding:5px; font-size:0.8em; margin-top:5px; background:#25D366" onclick="shareInvoiceWhatsApp('${inv.id}')">مشاركة واتساب</button>
        </div>`;
    }).join('');

    document.getElementById('custSpecificInvoices').innerHTML = invoicesHtml || '<p>لا توجد سجلات.</p>';
}

function updateCustomerDebtDisplay(custId) {
    const custInvoices = invoices.filter(inv => inv.custId === custId);
    let totalDebt = 0;
    custInvoices.forEach(inv => totalDebt += (inv.remaining || 0));
    document.getElementById('recTotalDebt').innerText = totalDebt;
}

function closeCustomerRecords() {
    document.getElementById('customerRecordsDetail').style.display = 'none';
    document.getElementById('recordsCustomerList').style.display = 'block';
    currentRecordCustId = null;
}

// زر التسديد
async function payDebt() {
    const amount = parseFloat(document.getElementById('payDebtAmount').value);
    if(!amount || !currentRecordCustId) return;

    // إنشاء سجل "تسديد" (فاتورة فارغة لكن بمدفوعات)
    const paymentRecord = {
        date: new Date().toISOString(),
        custId: currentRecordCustId,
        items: [], // لا توجد سلع
        total: 0,
        paid: amount,
        remaining: -amount // بالسالب يعني تسديد للدين العام
    };

    await window.addDoc(window.collection(window.db, "invoices"), paymentRecord);
    
    document.getElementById('payDebtAmount').value = '';
    // تحديث العرض
    openCustomerRecords(currentRecordCustId);
    alert("تم تسجيل التسديد");
}


// --- 7. الفاتورة والطباعة والواتساب ---
function showInvoiceModal(invoice) {
    const customer = customers.find(c => c.id === invoice.custId);
    
    document.getElementById('printShopName').innerText = currentSettings.name || 'فاتورة مبيعات';
    document.getElementById('printShopPhone').innerText = currentSettings.phone || '';

    document.getElementById('invDate').innerText = new Date(invoice.date).toLocaleString();
    document.getElementById('invCust').innerText = customer ? customer.name : 'زبون غير موجود';
    document.getElementById('invItems').innerHTML = invoice.items.map(i => `
        <tr><td>${i.name}</td><td>${i.qty}</td><td>${i.total}</td></tr>
    `).join('');
    
    document.getElementById('invTotal').innerText = invoice.total;
    document.getElementById('invPaid').innerText = invoice.paid;
    document.getElementById('invRem').innerText = invoice.remaining;

    document.getElementById('invoiceModal').style.display = 'flex';
}

function closeInvoice() {
    document.getElementById('invoiceModal').style.display = 'none';
}

// التعديل الخامس: معالجة رقم الواتساب الذكية
function formatPhoneNumber(rawNumber) {
    // إزالة المسافات
    let phone = rawNumber.trim();
    // إذا بدأ بـ 0، احذفه (مثال 078 -> 78)
    if (phone.startsWith('0')) {
        phone = phone.substring(1);
    }
    // إذا لم يبدأ بمفتاح الدولة (964)، أضفه
    if (!phone.startsWith('964')) {
        phone = '964' + phone;
    }
    return phone;
}

function sendWhatsApp() {
    if (!lastInvoice) return;
    shareInvoiceWhatsAppHelper(lastInvoice);
}

function shareInvoiceWhatsApp(invId) {
    const inv = invoices.find(i => i.id === invId);
    if(inv) shareInvoiceWhatsAppHelper(inv);
}

function shareInvoiceWhatsAppHelper(invoice) {
    const customer = customers.find(c => c.id === invoice.custId);
    if(!customer) return;

    const phone = formatPhoneNumber(customer.phone);
    const shopName = currentSettings.name ? `*${currentSettings.name}*` : '*فاتورة مبيعات*';

    let message = `${shopName}%0a`;
    message += `مرحباً ${customer.name}%0a`;
    message += `التاريخ: ${new Date(invoice.date).toLocaleDateString()}%0a`;
    
    if(invoice.items.length > 0) {
        message += `------------------%0a`;
        invoice.items.forEach(item => {
            message += `${item.name} (عدد ${item.qty}): ${item.total}%0a`;
        });
        message += `------------------%0a`;
    } else {
        message += `*دفعة تسديد حساب*%0a`;
    }
    
    message += `المطلوب: ${invoice.total}%0a`;
    message += `الواصل: ${invoice.paid}%0a`;
    message += `الباقي في هذه القائمة: ${invoice.remaining}%0a`;
    
    if(currentSettings.phone) message += `%0aللاستفسار: ${currentSettings.phone}`;

    const url = `https://wa.me/${phone}?text=${message}`;
    window.open(url, '_blank');
}

// --- 8. الإعدادات ---
function saveSettings() {
    const name = document.getElementById('shopName').value;
    const phone = document.getElementById('shopPhone').value;
    currentSettings = { name, phone };
    localStorage.setItem('shopSettings', JSON.stringify(currentSettings));
    alert('تم حفظ الإعدادات');
}

// --- 9. PWA تثبيت التطبيق ---
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('pwa-install-banner').style.display = 'flex';
});

document.getElementById('installBtn').addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            document.getElementById('pwa-install-banner').style.display = 'none';
        }
        deferredPrompt = null;
    }
});
