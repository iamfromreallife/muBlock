/*
 * Classic-style popup presentation adapter for uBlock Origin Lite.
 * GPL-3.0-or-later.
 * The original popup.js owns all filtering-mode operations and picker actions.
 */
const main = document.querySelector('main');
const slider = document.querySelector('.filteringModeSlider');
const hostname = document.querySelector('#hostname');

if (main && slider && hostname && !document.querySelector('#classicPower')) {
    const button = document.createElement('button');
    button.id = 'classicPower';
    button.type = 'button';
    button.title = 'Toggle filtering for this website';
    button.setAttribute('aria-label', button.title);
    button.setAttribute('aria-pressed', 'true');
    button.innerHTML = '<svg aria-hidden="true" viewBox="0 0 1536 1664"><path d="m1536 896q0 156-61 298-61 142-164 245-103 103-245 164-142 61-298 61t-298-61Q328 1542 225 1439 122 1336 61 1194 0 1052 0 896q0-182 80.5-343T307 283q43-32 95.5-25t83.5 50q32 42 24.5 94.5T461 487Q363 561 309.5 668T256 896q0 104 40.5 198.5t109.5 163.5q69 69 163.5 109.5T768 1408q104 0 198.5-40.5T1130 1258q69-69 109.5-163.5T1280 896q0-121-53.5-228T1075 487q-42-32-49.5-84.5T1050 308q31-43 84-50t95 25q146 109 226.5 270T1536 896zM896 128v640q0 52-38 90t-90 38q-52 0-90-38t-38-90V128q0-52 38-90t90-38q52 0 90 38t38 90z"/></svg>';
    slider.parentNode.insertBefore(button, slider);

    const modeDescription = document.createElement('div');
    modeDescription.id = 'classicModeDescription';
    modeDescription.textContent = 'Filtering modes: off · basic · optimal · complete';
    slider.insertAdjacentElement('afterend', modeDescription);

    let lastActiveLevel = 2;
    const update = () => {
        const current = Number(slider.dataset.level);
        if (!Number.isInteger(current) || current < 0 || current > 3) return;
        if (current !== 0) lastActiveLevel = current;
        button.classList.toggle('off', current === 0);
        button.setAttribute('aria-pressed', String(current !== 0));
        button.setAttribute('aria-label', current === 0
            ? 'Enable filtering on this website'
            : 'Disable filtering on this website');
        button.title = button.getAttribute('aria-label');
    };
    new MutationObserver(update).observe(slider, {
        attributes: true, attributeFilter: ['data-level']
    });
    update();

    button.addEventListener('click', () => {
        const current = Number(slider.dataset.level);
        if (!Number.isInteger(current) || document.body.classList.contains('busy')) return;
        // Reuse Lite's own click handler, which persists the filtering-mode change.
        const next = current === 0 ? lastActiveLevel : 0;
        const target = slider.querySelector('span[data-level="' + next + '"]');
        if (target) target.click();
    });
}
