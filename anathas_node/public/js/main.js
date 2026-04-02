// Budget validation - warn but don't block (free budget system)
document.querySelectorAll('.budget-form').forEach(form => {
    form.addEventListener('submit', e => {
        const inputs = form.querySelectorAll('input[type="number"]');
        let total = 0;
        inputs.forEach(i => total += parseFloat(i.value) || 0);
        // Update total display if exists
        const totalDisplay = form.querySelector('#budget-total');
        if (totalDisplay) totalDisplay.textContent = total.toFixed(1) + '%';
        // No blocking - free budget allowed
    });
});

// Live budget total update
document.querySelectorAll('.budget-form input[type="number"]').forEach(input => {
    input.addEventListener('input', () => {
        const form = input.closest('.budget-form');
        if (!form) return;
        const inputs = form.querySelectorAll('input[type="number"]');
        let total = 0;
        inputs.forEach(i => total += parseFloat(i.value) || 0);
        const display = form.querySelector('#budget-total');
        if (display) {
            display.textContent = total.toFixed(1) + '%';
            display.style.color = total > 100 ? 'var(--red)' : total < 100 ? 'var(--gold)' : 'var(--green)';
        }
    });
});

// Notification counter
async function updateNotifs() {
    try {
        const r = await fetch('/api/notifications/count');
        const d = await r.json();
        document.querySelectorAll('.icon-badge').forEach(b => {
            b.textContent = d.count;
            b.style.display = d.count > 0 ? 'flex' : 'none';
        });
    } catch {}
}
if (document.querySelector('.site-header')) {
    updateNotifs();
    setInterval(updateNotifs, 30000);
}
