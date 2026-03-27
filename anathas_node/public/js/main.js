// Budget validation
document.querySelectorAll('.budget-form').forEach(form => {
    form.addEventListener('submit', e => {
        const inputs = form.querySelectorAll('input[type="number"]');
        let total = 0;
        inputs.forEach(i => total += parseFloat(i.value) || 0);
        if (Math.abs(total - 100) > 0.5) {
            e.preventDefault();
            alert(`Le total doit faire 100%. Actuellement : ${total.toFixed(1)}%`);
        }
    });
});

// Notification counter
async function updateNotifs() {
    try {
        const r = await fetch('/api/notifications/count');
        const d = await r.json();
        const b = document.querySelector('.icon-badge');
        if (b) { b.textContent = d.count; b.style.display = d.count > 0 ? 'flex' : 'none'; }
    } catch {}
}
if (document.querySelector('.site-header')) {
    updateNotifs();
    setInterval(updateNotifs, 30000);
}
