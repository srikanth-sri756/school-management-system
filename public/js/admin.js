// Behaviour shared by the admin / staff pages (loaded with defer from partials/admin-head.ejs).
(function () {
  const body = document.body;

  // --- Sidebar (off-canvas below 1024px) ---
  document.querySelectorAll('[data-sidebar-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const open = body.classList.toggle('sidebar-open');
      button.setAttribute('aria-expanded', String(open));
    });
  });
  document.querySelectorAll('[data-sidebar-close]').forEach((el) => {
    el.addEventListener('click', () => body.classList.remove('sidebar-open'));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') body.classList.remove('sidebar-open', 'menu-open');
  });

  // --- Student Portal full-screen menu (below 1180px) ---
  document.querySelectorAll('[data-menu-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const open = body.classList.toggle('menu-open');
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
  });

  // --- Flash toasts ---
  document.querySelectorAll('.toast').forEach((toast) => {
    const close = () => {
      toast.classList.add('is-leaving');
      setTimeout(() => toast.remove(), 250);
    };
    const button = toast.querySelector('button');
    if (button) button.addEventListener('click', close);
    setTimeout(close, 6000);
  });

  // --- Photo field: preview the chosen image before saving ---
  document.querySelectorAll('[data-photo-input]').forEach((input) => {
    const preview = input.closest('.photo-field').querySelector('[data-photo-preview]');
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (!file || !file.type.startsWith('image/')) return;
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.alt = 'New photo preview';
      const avatar = document.createElement('span');
      avatar.className = 'avatar avatar--xl has-photo';
      avatar.appendChild(img);
      preview.replaceChildren(avatar);
    });
  });

  // --- Receipt upload: send the file to the fee chosen in the list ---
  document.querySelectorAll('[data-receipt-form]').forEach((form) => {
    const select = form.querySelector('[data-receipt-fee]');
    if (!select) return;
    const point = () => { form.action = `/fees/${select.value}/receipts`; };
    select.addEventListener('change', point);
    point();
  });

  // --- Admission type: transfer fields only for transfers ---
  // Radios [data-transfer-toggle] (value "yes" = transfer) show the [data-transfer-only]
  // blocks and make [data-transfer-required] fields required while shown.
  const transferRadios = Array.from(document.querySelectorAll('[data-transfer-toggle]'));
  if (transferRadios.length) {
    const syncTransfer = () => {
      const on = transferRadios.some((radio) => radio.checked && radio.value === 'yes');
      document.querySelectorAll('[data-transfer-only]').forEach((el) => { el.hidden = !on; });
      document.querySelectorAll('[data-transfer-required]').forEach((el) => { el.required = on; });
    };
    transferRadios.forEach((radio) => radio.addEventListener('change', syncTransfer));
    syncTransfer();
  }

  // --- Class + section pickers (partials/class-section-fields.ejs) ---
  // A section is needed once a class is chosen; with a "Class teacher?" select in the
  // same form ([data-class-teacher]), a class is needed when it is set to yes.
  document.querySelectorAll('[data-grade-select]').forEach((grade) => {
    const section = grade.form && grade.form.querySelector('[data-section-select]');
    const classTeacher = grade.form && grade.form.querySelector('[data-class-teacher]');
    if (!section) return;
    const sync = () => {
      if (classTeacher) grade.required = classTeacher.value === 'yes';
      section.required = grade.required || grade.value !== '';
    };
    grade.addEventListener('change', sync);
    if (classTeacher) classTeacher.addEventListener('change', sync);
    sync();
  });

  // --- All-or-none field groups (e.g. bank details on an existing teacher) ---
  // Inside [data-all-or-none], the [data-together] fields become required once any is filled.
  document.querySelectorAll('[data-all-or-none]').forEach((group) => {
    const fields = Array.from(group.querySelectorAll('[data-together]'));
    const sync = () => {
      const any = fields.some((field) => field.value.trim() !== '');
      fields.forEach((field) => { field.required = any; });
    };
    fields.forEach((field) => field.addEventListener('input', sync));
    sync();
  });

  // --- Confirm destructive actions ---
  document.querySelectorAll('form[action*="/delete"]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      if (!confirm(form.dataset.confirm || 'Are you sure you want to delete this record? This cannot be undone.')) {
        e.preventDefault();
      }
    });
  });

  // --- Client-side table filters ---
  // <div data-filter-for="tableId"> holds inputs with data-col (column index) and
  // data-match: contains | equals | min | max | from | to. A cell's data-value, when
  // present, is used instead of its text (numbers and ISO dates).
  document.querySelectorAll('[data-filter-for]').forEach((bar) => {
    const table = document.getElementById(bar.dataset.filterFor);
    if (!table) return;
    const rows = Array.from(table.tBodies[0].rows).filter((row) => !row.hasAttribute('data-filter-empty'));
    const emptyRow = table.querySelector('[data-filter-empty]');
    const inputs = Array.from(bar.querySelectorAll('[data-col]'));
    const count = document.querySelector(`[data-filter-count="${bar.dataset.filterFor}"]`);

    const cellValue = (row, col) => {
      const cell = row.cells[col];
      if (!cell) return '';
      return (cell.dataset.value !== undefined ? cell.dataset.value : cell.textContent).trim();
    };

    const apply = () => {
      let shown = 0;
      rows.forEach((row) => {
        const visible = inputs.every((input) => {
          const wanted = input.value.trim();
          if (!wanted) return true;
          const value = cellValue(row, Number(input.dataset.col));
          switch (input.dataset.match) {
            case 'equals': return value.toLowerCase() === wanted.toLowerCase();
            case 'min': return parseFloat(value) >= parseFloat(wanted);
            case 'max': return parseFloat(value) <= parseFloat(wanted);
            case 'from': return value >= wanted;
            case 'to': return value <= wanted;
            default: return value.toLowerCase().includes(wanted.toLowerCase());
          }
        });
        row.hidden = !visible;
        if (visible) shown += 1;
      });
      if (emptyRow) emptyRow.hidden = shown !== 0 || rows.length === 0;
      if (count) {
        count.textContent = shown === rows.length
          ? `${rows.length} ${rows.length === 1 ? 'record' : 'records'}`
          : `Showing ${shown} of ${rows.length}`;
      }
    };

    inputs.forEach((input) => input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', apply));
    const reset = bar.querySelector('[data-filter-reset]');
    if (reset) {
      reset.addEventListener('click', () => {
        inputs.forEach((input) => { input.value = ''; });
        apply();
      });
    }
    apply();
  });

  // --- Block attendance on Sundays and declared holidays ---
  // <input type="date" data-working-day data-warning="#id" data-submit="#id">
  document.querySelectorAll('[data-working-day]').forEach((input) => {
    const warning = document.querySelector(input.dataset.warning);
    const submit = document.querySelector(input.dataset.submit);
    const check = async () => {
      if (!input.value) return;
      try {
        const response = await fetch(`/holidays/check-working-day?date=${encodeURIComponent(input.value)}`);
        const data = await response.json();
        if (!data.isWorkingDay) {
          const reason = data.type === 'sunday'
            ? 'This date is a Sunday (weekly off).'
            : `This date is a holiday: ${data.reason}.`;
          warning.querySelector('[data-message]').textContent = `${reason} Attendance cannot be marked.`;
          warning.hidden = false;
          if (submit) submit.disabled = true;
        } else {
          warning.hidden = true;
          if (submit) submit.disabled = false;
        }
      } catch (error) {
        console.error('Could not check the date:', error);
      }
    };
    input.addEventListener('change', check);
    check();
  });
})();
