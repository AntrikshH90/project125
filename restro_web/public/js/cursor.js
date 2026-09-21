(function () {
    'use strict';

    var finePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
    var cursor = document.getElementById('cursor');

    if (!cursor || !finePointer) {
        if (cursor) cursor.style.display = 'none';
        return;
    }

    var dot = cursor.querySelector('.cursor-dot');
    var ring = cursor.querySelector('.cursor-ring');

    var mouseX = window.innerWidth / 2;
    var mouseY = window.innerHeight / 2;
    var ringX = mouseX;
    var ringY = mouseY;

    document.addEventListener('mousemove', function (e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
        dot.style.left = mouseX + 'px';
        dot.style.top = mouseY + 'px';
    });

    function animate() {
        ringX += (mouseX - ringX) * 0.16;
        ringY += (mouseY - ringY) * 0.16;
        ring.style.left = ringX + 'px';
        ring.style.top = ringY + 'px';
        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);

    var hoverSelector = 'a, button, input, select, textarea, .magnetic, .menu-tab';

    document.addEventListener('mouseover', function (e) {
        if (e.target.closest(hoverSelector)) cursor.classList.add('hover');
    });
    document.addEventListener('mouseout', function (e) {
        if (e.target.closest(hoverSelector)) cursor.classList.remove('hover');
    });

    document.addEventListener('mousedown', function () {
        ring.style.transform = 'translate(-50%, -50%) scale(0.8)';
    });
    document.addEventListener('mouseup', function () {
        ring.style.transform = 'translate(-50%, -50%) scale(1)';
    });

    document.addEventListener('mouseleave', function () {
        cursor.style.opacity = '0';
    });
    document.addEventListener('mouseenter', function () {
        cursor.style.opacity = '1';
    });
})();
