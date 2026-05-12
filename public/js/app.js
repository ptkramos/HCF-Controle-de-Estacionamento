// SGP - Client-side JavaScript

document.addEventListener('DOMContentLoaded', () => {

    // === Copy to clipboard ===
    document.querySelectorAll('[data-copy]').forEach(btn => {
        btn.addEventListener('click', () => {
            const text = btn.getAttribute('data-copy');
            navigator.clipboard.writeText(text).then(() => {
                const originalHTML = btn.innerHTML;
                btn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i> Copiado!';
                lucide.createIcons();
                btn.classList.add('btn--success');
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.classList.remove('btn--success');
                }, 2000);
            });
        });
    });

    // === Date toggle (Agora / Agendar) ===
    const dateRadios = document.querySelectorAll('input[name="dateOption"]');
    const dateField = document.getElementById('eventDateField');
    
    if (dateRadios.length && dateField) {
        const eventDateInput = document.getElementById('eventDate');
        
        // Set today as min and default value
        if (eventDateInput) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            const formattedDate = `${yyyy}-${mm}-${dd}`;
            
            eventDateInput.setAttribute('min', formattedDate);
            eventDateInput.value = formattedDate;
        }

        dateRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                dateField.style.display = radio.value === 'agendar' ? 'block' : 'none';
                if (radio.value === 'agendar') {
                    eventDateInput.setAttribute('required', 'required');
                } else {
                    eventDateInput.removeAttribute('required');
                }
            });
        });
    }

    // === Print QR Code ===
    document.querySelectorAll('[data-print]').forEach(btn => {
        btn.addEventListener('click', () => {
            window.print();
        });
    });

    // === Auto-dismiss alerts ===
    document.querySelectorAll('.alert--success').forEach(alert => {
        setTimeout(() => {
            alert.style.opacity = '0';
            alert.style.transform = 'translateY(-10px)';
            setTimeout(() => alert.remove(), 300);
        }, 5000);
    });
});
