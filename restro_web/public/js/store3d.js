(function () {
    'use strict';

    var container = document.getElementById('scene-container');
    var loader = document.getElementById('loader');
    var loaderFill = document.getElementById('loaderFill');
    var hint = document.getElementById('hint');
    var infoCard = document.getElementById('infoCard');
    var infoTitle = document.getElementById('infoTitle');
    var infoText = document.getElementById('infoText');
    var btnOverview = document.getElementById('btnOverview');
    var hotspotLayer = document.getElementById('hotspots');

    function webglOK() {
        try {
            var c = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
        } catch (e) { return false; }
    }

    function fail(reason) {
        document.getElementById('nogl').hidden = false;
        document.getElementById('noglReason').textContent = reason;
        loader.classList.add('done');
    }

    // gsap fallback: tiny easeInOut tween so the page works even if gsap is blocked
    function tween(target, to, opts) {
        opts = opts || {};
        if (window.gsap) {
            gsap.to(target, Object.assign({}, to, opts));
            return;
        }
        var keys = Object.keys(to).filter(function (k) { return typeof to[k] === 'number'; });
        var from = {};
        keys.forEach(function (k) { from[k] = target[k]; });
        var dur = (opts.duration || 1) * 1000;
        var start = performance.now();
        function step(now) {
            var t = Math.min(1, (now - start) / dur);
            var e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            keys.forEach(function (k) { target[k] = from[k] + (to[k] - from[k]) * e; });
            if (opts.onUpdate) opts.onUpdate();
            if (t < 1) requestAnimationFrame(step);
            else if (opts.onComplete) opts.onComplete();
        }
        requestAnimationFrame(step);
    }

    function boot() {

    var HOTSPOTS = [
        {
            id: 'dining', name: 'Main Dining',
            desc: 'Our candle-lit main room. Oak tables, hand-thrown ceramics, and the low hum of an evening well spent.',
            cam: [2.8, 1.8, 4.6], look: [0, 0.85, 1.2], anchor: [0, 1.5, 1.2]
        },
        {
            id: 'chefs', name: "Chef's Table",
            desc: 'Six seats, front row to the fire. A tasting counter where every course is finished inches from the open flame.',
            cam: [0, 1.9, -2.4], look: [0, 1.0, -6.8], anchor: [0, 1.7, -5.6]
        },
        {
            id: 'bar', name: 'The Bar',
            desc: 'Smoked Old Fashioneds, rare amari, and a marble-top counter that has heard every story in town.',
            cam: [-6.2, 1.8, 1.6], look: [-11.6, 1.3, -0.8], anchor: [-11.0, 1.8, -0.8]
        },
        {
            id: 'cellar', name: 'Wine Cellar',
            desc: '3,000 bottles deep — Napa cabs, aged Barolos, and a sommelier who remembers what you drank last year.',
            cam: [6.2, 1.9, 1.6], look: [11.8, 1.5, -0.8], anchor: [11.2, 2.0, -0.8]
        },
        {
            id: 'patio', name: 'Garden Patio',
            desc: 'Al fresco evenings under string lights, surrounded by the herbs we cook with.',
            cam: [3.4, 1.9, 5.2], look: [8.6, 1.0, 7.2], anchor: [7.8, 1.6, 7.0]
        }
    ];

    var OVERVIEW = { cam: [0, 3.7, 11.8], look: [0, 1.1, -1.5] };

    var renderer;
    try {
        renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch (e) {
        fail('Your browser or graphics driver has WebGL disabled. Enable hardware acceleration in browser settings, or try Chrome / Edge.');
        return;
    }

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) {
        renderer.outputColorSpace = THREE.SRGBColorSpace;
    } else if ('outputEncoding' in renderer && THREE.sRGBEncoding) {
        renderer.outputEncoding = THREE.sRGBEncoding;
    }
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070302);
    scene.fog = new THREE.FogExp2(0x070302, 0.042);

    var camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 80);

    // ---------- Textures ----------
    function canvasTexture(w, h, draw) {
        var c = document.createElement('canvas');
        c.width = w; c.height = h;
        draw(c.getContext('2d'), w, h);
        var t = new THREE.CanvasTexture(c);
        if ('colorSpace' in t && THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
        return t;
    }

    function woodTexture(base, streak) {
        return canvasTexture(512, 512, function (ctx, w, h) {
            ctx.fillStyle = base;
            ctx.fillRect(0, 0, w, h);
            for (var i = 0; i < 90; i++) {
                ctx.strokeStyle = 'rgba(' + streak + ',' + (0.04 + Math.random() * 0.09) + ')';
                ctx.lineWidth = 1 + Math.random() * 2;
                ctx.beginPath();
                var y = Math.random() * h;
                ctx.moveTo(0, y);
                ctx.bezierCurveTo(w * 0.3, y + (Math.random() - 0.5) * 22, w * 0.6, y + (Math.random() - 0.5) * 22, w, y + (Math.random() - 0.5) * 12);
                ctx.stroke();
            }
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.fillRect(0, 0, w, 3);
            ctx.fillRect(0, h / 2, w, 3);
        });
    }

    function brickTexture() {
        return canvasTexture(512, 512, function (ctx, w, h) {
            ctx.fillStyle = '#160b05';
            ctx.fillRect(0, 0, w, h);
            var bw = 96, bh = 34;
            for (var row = 0; row * bh < h; row++) {
                for (var col = -1; col * bw < w + bw; col++) {
                    var x = col * bw + (row % 2 ? bw / 2 : 0);
                    var shade = 22 + Math.floor(Math.random() * 16);
                    ctx.fillStyle = 'rgb(' + (shade + 14) + ',' + (shade - 2) + ',' + (shade - 10) + ')';
                    ctx.fillRect(x + 2, row * bh + 2, bw - 4, bh - 4);
                }
            }
        });
    }

    var floorTex = woodTexture('#2a1408', '70,40,18');
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(8, 6);
    var wallTex = brickTexture();
    wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
    wallTex.repeat.set(6, 2);

    // ---------- Room ----------
    var room = new THREE.Group();
    scene.add(room);

    var floor = new THREE.Mesh(
        new THREE.PlaneGeometry(28, 20),
        new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85, metalness: 0.05 })
    );
    floor.rotation.x = -Math.PI / 2;
    room.add(floor);

    var ceiling = new THREE.Mesh(
        new THREE.PlaneGeometry(28, 20),
        new THREE.MeshStandardMaterial({ color: 0x0d0603, roughness: 1 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 5;
    room.add(ceiling);

    function wall(w, h, x, y, z, ry, texture) {
        var m = new THREE.Mesh(
            new THREE.PlaneGeometry(w, h),
            new THREE.MeshStandardMaterial({ map: texture || wallTex, roughness: 0.95 })
        );
        m.position.set(x, y, z);
        m.rotation.y = ry;
        room.add(m);
        return m;
    }
    wall(28, 5, 0, 2.5, -9, 0);            // north
    wall(28, 5, 0, 2.5, 9, Math.PI);       // south
    wall(20, 5, -13, 2.5, 0, Math.PI / 2); // west
    wall(20, 5, 13, 2.5, 0, -Math.PI / 2); // east

    // Wainscot trim
    var trimMat = new THREE.MeshStandardMaterial({ color: 0x1c0f06, roughness: 0.7 });
    [[0, -8.85, 0], [0, 8.85, 0]].forEach(function (p) {
        var t = new THREE.Mesh(new THREE.BoxGeometry(28, 0.5, 0.12), trimMat);
        t.position.set(p[0], 1.1, p[1]);
        room.add(t);
    });
    [[-12.85, 0, Math.PI / 2], [12.85, 0, Math.PI / 2]].forEach(function (p) {
        var t = new THREE.Mesh(new THREE.BoxGeometry(20, 0.5, 0.12), trimMat);
        t.position.set(p[0], 1.1, p[1]);
        t.rotation.y = p[2];
        room.add(t);
    });

    // ---------- Lights ----------
    scene.add(new THREE.AmbientLight(0x30201a, 0.55));
    scene.add(new THREE.HemisphereLight(0x2a1a12, 0x0a0503, 0.4));

    var flickerLights = [];
    function warmPoint(x, y, z, intensity, distance, color) {
        var l = new THREE.PointLight(color || 0xffa050, intensity, distance, 2);
        l.position.set(x, y, z);
        scene.add(l);
        return l;
    }

    warmPoint(-5.5, 3.4, 0.5, 1.1, 10);
    warmPoint(5.5, 3.4, 0.5, 1.1, 10);
    var barLight = warmPoint(-11, 2.6, -0.5, 0.9, 8);
    var fireLight = warmPoint(0, 1.2, -8.2, 2.2, 14, 0xff7a30);

    flickerLights.push({ light: fireLight, base: 2.2, amp: 0.9, speed: 11 });
    flickerLights.push({ light: barLight, base: 0.9, amp: 0.08, speed: 3 });

    // ---------- Furniture ----------
    var woodMat = new THREE.MeshStandardMaterial({ map: woodTexture('#33190b', '120,70,30'), roughness: 0.6 });
    var darkWood = new THREE.MeshStandardMaterial({ color: 0x241105, roughness: 0.7 });
    var brassMat = new THREE.MeshStandardMaterial({ color: 0x8a5a28, roughness: 0.35, metalness: 0.8 });
    var candleMat = new THREE.MeshStandardMaterial({ color: 0xf5e8d0, emissive: 0xffb45e, emissiveIntensity: 0.9, roughness: 0.4 });
    var flameMat = new THREE.MeshBasicMaterial({ color: 0xffb050 });
    var velvetMat = new THREE.MeshStandardMaterial({ color: 0x4a1c10, roughness: 0.9 });

    function table(x, z, r) {
        var g = new THREE.Group();
        var top = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.07, 28), woodMat);
        top.position.y = 0.78;
        var stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.76, 12), darkWood);
        stem.position.y = 0.4;
        var base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.05, 20), darkWood);
        base.position.y = 0.03;
        g.add(top, stem, base);

        var candle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.16, 10), candleMat);
        candle.position.y = 0.9;
        var flame = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), flameMat);
        flame.position.y = 1.0;
        g.add(candle, flame);

        for (var a = 0; a < 3; a++) {
            var ang = (a / 3) * Math.PI * 2 + 0.5;
            g.add(chair(x + Math.cos(ang) * (r + 0.45), z + Math.sin(ang) * (r + 0.45), -ang + Math.PI / 2));
        }
        g.position.set(x, 0, z);
        room.add(g);
        return g;
    }

    function chair(x, z, ry) {
        var g = new THREE.Group();
        var seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.42), velvetMat);
        seat.position.y = 0.46;
        var back = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.05), darkWood);
        back.position.set(0, 0.75, -0.19);
        g.add(seat, back);
        for (var i = 0; i < 4; i++) {
            var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.46, 8), darkWood);
            leg.position.set(i % 2 ? 0.17 : -0.17, 0.23, i < 2 ? 0.17 : -0.17);
            g.add(leg);
        }
        g.position.set(x, 0, z);
        g.rotation.y = ry;
        return g;
    }

    table(-5.5, -1.8, 0.85);
    table(-5.5, 2.6, 0.85);
    table(5.5, -1.8, 0.85);
    table(5.5, 2.6, 0.85);

    // Chef's table — long counter facing the fire
    (function () {
        var g = new THREE.Group();
        var top = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.08, 0.9), woodMat);
        top.position.y = 0.95;
        g.add(top);
        for (var i = 0; i < 6; i++) {
            var stool = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.62, 14), velvetMat);
            stool.position.set(-1.8 + i * 0.72, 0.31, 0.75);
            g.add(stool);
        }
        g.position.set(0, 0, -5.4);
        room.add(g);
    })();

    // Fireplace
    (function () {
        var g = new THREE.Group();
        var surround = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.6, 0.5), new THREE.MeshStandardMaterial({ map: brickTexture(), roughness: 1 }));
        surround.position.set(0, 1.3, -8.75);
        var opening = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 0.55), new THREE.MeshBasicMaterial({ color: 0x180602 }));
        opening.position.set(0, 0.62, -8.7);
        g.add(surround, opening);
        for (var i = 0; i < 3; i++) {
            var log = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 8), darkWood);
            log.rotation.z = Math.PI / 2;
            log.rotation.y = (i - 1) * 0.35;
            log.position.set(0, 0.16 + i * 0.16, -8.55);
            g.add(log);
        }
        room.add(g);
    })();

    // Bar — west wall
    (function () {
        var g = new THREE.Group();
        var counter = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.05, 6), woodMat);
        counter.position.set(-11.5, 0.52, -0.5);
        var top = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.06, 6.2), new THREE.MeshStandardMaterial({ color: 0x1f150f, roughness: 0.3, metalness: 0.1 }));
        top.position.set(-11.5, 1.08, -0.5);
        g.add(counter, top);
        for (var i = 0; i < 4; i++) {
            var stool = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.21, 0.66, 14), velvetMat);
            stool.position.set(-10.4, 0.33, -2.4 + i * 1.3);
            g.add(stool);
        }
        var shelf = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 5.4), darkWood);
        shelf.position.set(-12.6, 2.05, -0.5);
        g.add(shelf);
        var bottleColors = [0x7a1e10, 0x2a4a1e, 0x8a5a20, 0x40141e, 0x1e3a4a, 0x6a3a10];
        for (var b = 0; b < 12; b++) {
            var bottle = new THREE.Mesh(
                new THREE.CylinderGeometry(0.05, 0.06, 0.34, 10),
                new THREE.MeshStandardMaterial({ color: bottleColors[b % bottleColors.length], roughness: 0.25, emissive: bottleColors[b % bottleColors.length], emissiveIntensity: 0.25 })
            );
            bottle.position.set(-12.6, 2.26, -2.9 + b * 0.44);
            g.add(bottle);
            var neck = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.03, 0.16, 8), darkWood);
            neck.position.set(-12.6, 2.5, -2.9 + b * 0.44);
            g.add(neck);
        }
        room.add(g);
    })();

    // Wine cellar — east wall
    (function () {
        var g = new THREE.Group();
        var rackMat = new THREE.MeshStandardMaterial({ color: 0x1c0e06, roughness: 0.8 });
        var rack = new THREE.Mesh(new THREE.BoxGeometry(0.55, 3.2, 6), rackMat);
        rack.position.set(12.55, 1.6, -1);
        g.add(rack);
        var wineA = new THREE.MeshStandardMaterial({ color: 0x3a0d14, roughness: 0.3, emissive: 0x3a0d14, emissiveIntensity: 0.18 });
        var wineB = new THREE.MeshStandardMaterial({ color: 0x142a12, roughness: 0.3, emissive: 0x142a12, emissiveIntensity: 0.15 });
        for (var rowI = 0; rowI < 4; rowI++) {
            for (var b = 0; b < 10; b++) {
                var bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8), rowI % 2 ? wineA : wineB);
                bottle.rotation.x = Math.PI / 2;
                bottle.position.set(12.32, 0.65 + rowI * 0.72, -3.4 + b * 0.52);
                g.add(bottle);
            }
        }
        room.add(g);
    })();

    // Garden patio — southeast corner
    (function () {
        var g = new THREE.Group();
        var leafMat = new THREE.MeshStandardMaterial({ color: 0x1c3a16, roughness: 0.9 });
        var potMat = new THREE.MeshStandardMaterial({ color: 0x3a2010, roughness: 0.85 });
        [[6.8, 6.2], [8.4, 7.6], [10.6, 6.0], [9.4, 5.0]].forEach(function (p, i) {
            var pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.4, 12), potMat);
            pot.position.set(p[0], 0.2, p[1]);
            var bush = new THREE.Mesh(new THREE.SphereGeometry(0.45 + (i % 2) * 0.15, 10, 10), leafMat);
            bush.position.set(p[0], 0.85 + (i % 2) * 0.1, p[1]);
            bush.scale.y = 1.25;
            g.add(pot, bush);
        });
        var bulbs = [0xffb050];
        for (var s = 0; s < 5; s++) {
            var bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffc878 }));
            bulb.position.set(6.4 + s * 1.1, 3.0 - Math.abs(s - 2) * 0.16, 8.4);
            g.add(bulb);
            if (s < 4) {
                var wire = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 1.12, 4), darkWood);
                wire.position.set(6.95 + s * 1.1, 2.98, 8.4);
                wire.rotation.z = Math.PI / 2;
                g.add(wire);
            }
        }
        void bulbs;
        room.add(g);
    })();

    // Pendant lamps
    function pendant(x, z) {
        var cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.6, 6), darkWood);
        cord.position.set(x, 4.2, z);
        var shade = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.3, 18, 1, true), brassMat);
        shade.position.set(x, 3.4, z);
        var bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffd9a0 }));
        bulb.position.set(x, 3.3, z);
        room.add(cord, shade, bulb);
    }
    pendant(-5.5, 0.4);
    pendant(5.5, 0.4);
    pendant(0, -5.4);

    // Windows on south wall
    (function () {
        var glow = new THREE.MeshBasicMaterial({ color: 0x101c2a });
        [[-7, 8.93], [0, 8.93], [7, 8.93]].forEach(function (p) {
            var win = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.8), glow);
            win.position.set(p[0], 3.1, p[1]);
            win.rotation.y = Math.PI;
            room.add(win);
        });
    })();

    // Ember particles
    var EMBER_COUNT = 140;
    var emberGeo = new THREE.BufferGeometry();
    var emberPos = new Float32Array(EMBER_COUNT * 3);
    var emberData = [];
    for (var e = 0; e < EMBER_COUNT; e++) {
        emberData.push({
            ox: -1.0 + Math.random() * 2.0,
            oz: -8.3 + Math.random() * 0.6,
            y: Math.random() * 3.2,
            speed: 0.35 + Math.random() * 0.75,
            sway: Math.random() * Math.PI * 2,
            swaySpeed: 0.6 + Math.random() * 1.4
        });
    }
    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
    var emberTex = canvasTexture(64, 64, function (ctx) {
        var g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        g.addColorStop(0, 'rgba(255,190,110,1)');
        g.addColorStop(0.35, 'rgba(255,120,40,0.7)');
        g.addColorStop(1, 'rgba(255,80,20,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 64, 64);
    });
    var embers = new THREE.Points(emberGeo, new THREE.PointsMaterial({
        size: 0.075, map: emberTex, transparent: true, opacity: 0.85,
        blending: THREE.AdditiveBlending, depthWrite: false
    }));
    scene.add(embers);

    // ---------- Camera controls ----------
    var state = {
        target: new THREE.Vector3(...OVERVIEW.look),
        radius: 14.5,
        yaw: Math.PI,
        pitch: 0.22
    };
    var flying = false;
    var interacted = false;

    function applyCamera() {
        var cp = Math.cos(state.pitch);
        camera.position.set(
            state.target.x + Math.sin(state.yaw) * cp * state.radius,
            state.target.y + Math.sin(state.pitch) * state.radius,
            state.target.z + Math.cos(state.yaw) * cp * state.radius
        );
        camera.lookAt(state.target);
    }
    applyCamera();
    camera.position.set(0, 2.0, 14.2);

    function yawPitchFrom(camPos, look) {
        var d = new THREE.Vector3().subVectors(camPos, look);
        var r = d.length();
        var yaw = Math.atan2(d.x, d.z);
        var pitch = Math.asin(THREE.MathUtils.clamp(d.y / r, -1, 1));
        return { yaw: yaw, pitch: pitch, radius: r };
    }

    function flyTo(camPos, look, dur, onDone) {
        flying = true;
        var end = yawPitchFrom(new THREE.Vector3(camPos[0], camPos[1], camPos[2]), new THREE.Vector3(look[0], look[1], look[2]));
        var startYaw = state.yaw;
        var deltaYaw = end.yaw - state.yaw;
        while (deltaYaw > Math.PI) deltaYaw -= Math.PI * 2;
        while (deltaYaw < -Math.PI) deltaYaw += Math.PI * 2;
        var from = { t: state.target.clone(), r: state.radius, y: startYaw, p: state.pitch };
        var to = {
            t: new THREE.Vector3(look[0], look[1], look[2]),
            r: THREE.MathUtils.clamp(end.radius, 1.7, 3.4),
            y: startYaw + deltaYaw,
            p: THREE.MathUtils.clamp(end.pitch, -0.05, 0.85)
        };
        var proxy = { t: 0 };
        tween(proxy, { t: 1 }, {
            duration: dur || 2.0,
            onUpdate: function () {
                var k = proxy.t;
                state.target.lerpVectors(from.t, to.t, k);
                state.radius = from.r + (to.r - from.r) * k;
                state.yaw = from.y + (to.y - from.y) * k;
                state.pitch = from.p + (to.p - from.p) * k;
                applyCamera();
            },
            onComplete: function () {
                flying = false;
                if (onDone) onDone();
            }
        });
    }

    // ---------- Input ----------
    var dragging = false, lastX = 0, lastY = 0;
    var el = renderer.domElement;
    el.addEventListener('pointerdown', function (e) {
        dragging = true; lastX = e.clientX; lastY = e.clientY;
        interacted = true; hint.classList.add('fade');
        el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', function (e) {
        if (!dragging || flying) return;
        state.yaw -= (e.clientX - lastX) * 0.0042;
        state.pitch += (e.clientY - lastY) * 0.0035;
        state.pitch = THREE.MathUtils.clamp(state.pitch, -0.12, 0.95);
        lastX = e.clientX; lastY = e.clientY;
        applyCamera();
    });
    window.addEventListener('pointerup', function () { dragging = false; });
    el.addEventListener('wheel', function (e) {
        e.preventDefault();
        interacted = true; hint.classList.add('fade');
        if (flying) return;
        state.radius = THREE.MathUtils.clamp(state.radius * (1 + e.deltaY * 0.0011), 1.3, 14.5);
        applyCamera();
    }, { passive: false });

    // ---------- Hotspots UI ----------
    var activeId = null;
    HOTSPOTS.forEach(function (h) {
        var m = document.createElement('div');
        m.className = 'marker';
        m.dataset.id = h.id;
        m.innerHTML = '<span class="marker-dot"></span><span class="marker-label">' + h.name + '</span>';
        m.addEventListener('click', function () { goTo(h); });
        hotspotLayer.appendChild(m);
        h.el = m;
    });

    function goTo(h) {
        if (flying) return;
        interacted = true; hint.classList.add('fade');
        activeId = h.id;
        HOTSPOTS.forEach(function (o) { o.el.classList.toggle('active', o.id === h.id); });
        infoTitle.textContent = h.name;
        infoText.textContent = h.desc;
        flyTo(h.cam, h.look, 2.2, function () {
            infoCard.classList.add('show');
        });
    }

    function backToOverview() {
        if (flying) return;
        activeId = null;
        infoCard.classList.remove('show');
        HOTSPOTS.forEach(function (o) { o.el.classList.remove('active'); });
        flyTo(OVERVIEW.cam, OVERVIEW.look, 2.0);
    }
    btnOverview.addEventListener('click', backToOverview);

    var projected = new THREE.Vector3();
    function updateMarkers() {
        HOTSPOTS.forEach(function (h) {
            projected.set(h.anchor[0], h.anchor[1], h.anchor[2]);
            var dist = projected.distanceTo(camera.position);
            projected.project(camera);
            var behind = projected.z > 1;
            var x = (projected.x * 0.5 + 0.5) * window.innerWidth;
            var y = (-projected.y * 0.5 + 0.5) * window.innerHeight;
            h.el.style.left = x + 'px';
            h.el.style.top = y + 'px';
            h.el.style.opacity = (behind || dist > 20) ? '0' : (activeId && activeId !== h.id && dist > 9 ? '0.35' : '1');
            h.el.style.pointerEvents = (behind || dist > 20) ? 'none' : 'auto';
        });
    }

    // ---------- Animation loop ----------
    var clock = new THREE.Clock();
    var idleT = 0;
    function animate() {
        requestAnimationFrame(animate);
        var dt = Math.min(clock.getDelta(), 0.05);
        var t = clock.elapsedTime;

        flickerLights.forEach(function (f) {
            f.light.intensity = f.base + (Math.sin(t * f.speed) * 0.5 + Math.sin(t * f.speed * 2.7) * 0.3 + Math.sin(t * f.speed * 5.3) * 0.2) * f.amp;
        });

        var pos = emberGeo.attributes.position.array;
        for (var i = 0; i < EMBER_COUNT; i++) {
            var d = emberData[i];
            d.y += d.speed * dt;
            if (d.y > 3.4) d.y = 0;
            pos[i * 3] = d.ox + Math.sin(t * d.swaySpeed + d.sway) * 0.22;
            pos[i * 3 + 1] = d.y;
            pos[i * 3 + 2] = d.oz;
        }
        emberGeo.attributes.position.needsUpdate = true;

        if (!flying && !interacted) {
            idleT += dt;
            state.yaw = Math.PI + Math.sin(idleT * 0.18) * 0.14;
            applyCamera();
        } else if (!flying && !dragging) {
            applyCamera();
        }

        updateMarkers();
        renderer.render(scene, camera);
    }

    // ---------- Resize ----------
    window.addEventListener('resize', function () {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ---------- Boot ----------
    var p = { v: 0 };
    tween(p, { v: 100 }, {
        duration: 1.6,
        onUpdate: function () { loaderFill.style.width = p.v + '%'; },
        onComplete: function () {
            loader.classList.add('done');
            flyTo(OVERVIEW.cam, OVERVIEW.look, 3.2);
            setTimeout(function () { hint.classList.add('fade'); }, 9000);
        }
    });

    tween(state, { radius: 8.8 }, { duration: 3.4, onUpdate: applyCamera });

    animate();
    }

    function startWhenReady() {
        if (typeof THREE !== 'undefined' && window.__threeState !== 'failed') {
            if (!webglOK()) {
                fail('WebGL is disabled on this device. Enable hardware acceleration in your browser settings, or try Chrome / Edge.');
                return;
            }
            boot();
        }
    }

    if (typeof THREE !== 'undefined') {
        startWhenReady();
    } else if (window.__threeState === 'failed') {
        fail("Couldn't load the 3D engine from the CDN. Check your internet connection and reload the page.");
    } else {
        window.addEventListener('three-ready', startWhenReady, { once: true });
        window.addEventListener('three-failed', function () {
            fail("Couldn't load the 3D engine from the CDN. Check your internet connection and reload the page.");
        }, { once: true });
    }
})();
