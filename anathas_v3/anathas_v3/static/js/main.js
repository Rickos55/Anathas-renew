// Anathas main.js

// Budget validation (total = 100)
document.querySelectorAll('.budget-form').forEach(form => {
    form.addEventListener('submit', e => {
        const inputs = form.querySelectorAll('input[type="number"]');
        let total = 0;
        inputs.forEach(i => total += parseFloat(i.value) || 0);
        if (Math.abs(total - 100) > 0.5) {
            e.preventDefault();
            alert(`Le total doit faire exactement 100%. Actuellement : ${total.toFixed(1)}%`);
        }
    });
});

// Notification counter
async function updateNotifCount() {
    try {
        const res = await fetch('/api/notifications/count');
        const data = await res.json();
        const badge = document.querySelector('.icon-badge');
        if (badge) {
            badge.textContent = data.count;
            badge.style.display = data.count > 0 ? 'flex' : 'none';
        }
    } catch {}
}
if (document.querySelector('.site-header')) {
    updateNotifCount();
    setInterval(updateNotifCount, 30000);
}
