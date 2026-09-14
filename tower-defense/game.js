(() => {
  const W = 390;
  const H = 780;
  const COLS = 9;
  const ROWS = 12;
  const MAP_TOP = 78;
  const TILE = 40;
  const MAP_LEFT = (W - COLS * TILE) / 2;
  const WAVES = 8;
  const START_LIVES = 15;
  const MAX_LEVEL = 3;

  // Path tiles (column, row). Enemies walk these. Towers cannot be placed here.
  const PATH = [
    [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1],
    [7, 2], [7, 3], [7, 4],
    [6, 4], [5, 4], [4, 4], [3, 4], [2, 4], [1, 4],
    [1, 5], [1, 6], [1, 7],
    [2, 7], [3, 7], [4, 7], [5, 7], [6, 7], [7, 7],
    [7, 8], [7, 9], [7, 10],
    [6, 10], [5, 10], [4, 10], [3, 10], [2, 10], [1, 10], [0, 10]
  ];
  const PATH_SET = new Set(PATH.map(([c, r]) => `${c},${r}`));

  // ADD / EDIT TOWERS HERE
  // sprite = filename in assets/ without .png
  const TOWERS = {
    sword: { id: 'sword', name: 'Sword', sprite: 'sword', dmg: 24, range: 72, rate: 360, color: 0x86efac, splash: 0, slow: 1, shot: 0x86efac },
    gunner: { id: 'gunner', name: 'Gunner', sprite: 'gunner', dmg: 15, range: 145, rate: 500, color: 0xfbbf24, splash: 0, slow: 1, shot: 0xfde68a },
    tank: { id: 'tank', name: 'Tank', sprite: 'tank', dmg: 12, range: 98, rate: 880, color: 0x94a3b8, splash: 58, slow: 0.55, shot: 0xcbd5e1 }
  };

  // ADD / EDIT MONSTERS HERE
  // hpMul / spdMul scale with the wave. bounty is score only (cannot buy with it).
  const MONSTERS = {
    homework: { id: 'homework', name: 'Homework', icon: '📝', hpMul: 1.2, spdMul: 0.85, bounty: 10 },
    quiz: { id: 'quiz', name: 'Quiz', icon: '❓', hpMul: 1, spdMul: 1, bounty: 14 },
    exam: { id: 'exam', name: 'Exam', icon: '📄', hpMul: 0.8, spdMul: 1.28, bounty: 18 }
  };
  const WAVE_MONSTERS = ['homework', 'quiz', 'exam'];

  // ADD / EDIT QUESTIONS HERE
  // c = index of the correct answer in a (0, 1, or 2)
  const QUESTIONS = [
    { q: '12 × 8 = ?', a: ['86', '96', '108'], c: 1 },
    { q: 'Water’s chemical formula is…', a: ['CO2', 'H2O', 'O2'], c: 1 },
    { q: 'Past tense of “go”?', a: ['goed', 'went', 'gone'], c: 1 },
    { q: 'A right angle is…', a: ['90°', '45°', '180°'], c: 0 },
    { q: 'The Earth orbits the…', a: ['Moon', 'Sun', 'Mars'], c: 1 },
    { q: 'Opposite of “increase”?', a: ['expand', 'decrease', 'raise'], c: 1 },
    { q: '7² = ?', a: ['14', '49', '21'], c: 1 },
    { q: 'Photosynthesis happens in…', a: ['roots', 'leaves', 'flowers'], c: 1 }
  ];

  function tileCenter(c, r) {
    return {
      x: MAP_LEFT + c * TILE + TILE / 2,
      y: MAP_TOP + r * TILE + TILE / 2
    };
  }

  function pathPoints() {
    return PATH.map(([c, r]) => tileCenter(c, r));
  }

  function loadArt(scene) {
    scene.load.image('sword', 'assets/sword.png');
    scene.load.image('gunner', 'assets/gunner.png');
    scene.load.image('tank', 'assets/tank.png');
  }

  class BootScene extends Phaser.Scene {
    constructor() {
      super('boot');
    }

    preload() {
      loadArt(this);
    }

    create() {
      this.scene.start('menu');
    }
  }

  class MenuScene extends Phaser.Scene {
    constructor() {
      super('menu');
    }

    create() {
      this.cameras.main.setBackgroundColor('#0b0f19');
      this.add.image(W / 2, 168, 'sword').setDisplaySize(92, 140);
      this.add.text(W / 2, 250, 'STUDY DEFENSE', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '32px',
        fontStyle: 'bold',
        color: '#00d5ff'
      }).setOrigin(0.5);

      this.add.text(W / 2, 318, 'Answer a question to place or upgrade\na fighter. Kills add bounty (score only).', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        color: '#9fb0c7',
        align: 'center',
        lineSpacing: 6
      }).setOrigin(0.5);

      const btn = this.add.rectangle(W / 2, 430, 220, 58, 0x00d5ff, 1).setInteractive({ useHandCursor: true });
      const label = this.add.text(W / 2, 430, 'PLAY', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#0b0f19'
      }).setOrigin(0.5);

      this.add.text(W / 2, 540, 'Sword: short range, hard hits\nGunner: long range\nTank: splash + slow', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#64748b',
        align: 'center',
        lineSpacing: 6
      }).setOrigin(0.5);

      const start = () => this.scene.start('game');
      btn.on('pointerdown', start);
      label.setInteractive({ useHandCursor: true }).on('pointerdown', start);
    }
  }

  class GameScene extends Phaser.Scene {
    constructor() {
      super('game');
    }

    create() {
      this.hideOverlay('quiz');
      this.hideOverlay('end');
      this.cameras.main.setBackgroundColor('#0b0f19');
      this.bounty = 0;
      this.lives = START_LIVES;
      this.wave = 0;
      this.selected = 'sword';
      this.qIndex = 0;
      this.towers = [];
      this.enemies = [];
      this.shots = [];
      this.busy = false;
      this.waveActive = false;
      this.spawning = false;
      this.spawnLeft = 0;
      this.spawnTimer = 0;
      this.waveHp = 0;
      this.waveSpeed = 0;
      this.waveKind = 'homework';
      this.ended = false;
      this.pending = null;
      this.ghost = null;
      this.waypoints = pathPoints();

      this.drawMap();
      this.buildHud();
      this.buildShop();
      this.input.on('pointerdown', this.onTap, this);
      this.nextWaveSoon(2800);
    }

    drawMap() {
      const g = this.add.graphics();
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const x = MAP_LEFT + c * TILE;
          const y = MAP_TOP + r * TILE;
          const path = PATH_SET.has(`${c},${r}`);
          g.fillStyle(path ? 0x2a1f14 : 0x163024, 1);
          g.fillRoundedRect(x + 2, y + 2, TILE - 4, TILE - 4, 6);
        }
      }
      const start = tileCenter(PATH[0][0], PATH[0][1]);
      const end = tileCenter(PATH[PATH.length - 1][0], PATH[PATH.length - 1][1]);
      this.add.text(start.x, start.y - 28, 'START', {
        fontSize: '11px', fontStyle: 'bold', color: '#fbbf24'
      }).setOrigin(0.5);
      this.add.text(end.x, end.y, '🏫', { fontSize: '22px' }).setOrigin(0.5);
    }

    buildHud() {
      this.add.rectangle(W / 2, 36, W - 20, 56, 0x162235, 1).setStrokeStyle(1, 0x2a3d57);
      this.waveText = this.add.text(24, 36, '', { fontSize: '15px', fontStyle: 'bold', color: '#e2e8f0' }).setOrigin(0, 0.5);
      this.bountyText = this.add.text(W / 2, 36, '', { fontSize: '15px', fontStyle: 'bold', color: '#fbbf24' }).setOrigin(0.5);
      this.lifeText = this.add.text(W - 24, 36, '', { fontSize: '15px', fontStyle: 'bold', color: '#fb7185' }).setOrigin(1, 0.5);
      this.refreshHud();
    }

    buildShop() {
      const y = 668;
      this.add.rectangle(W / 2, y + 28, W - 16, 148, 0x122033, 1).setStrokeStyle(1, 0x2a3d57);
      this.add.text(24, y - 28, 'FIGHTERS', { fontSize: '12px', fontStyle: 'bold', color: '#00d5ff' });
      this.shopHints = this.add.text(W - 24, y - 28, 'Answer a question to place', {
        fontSize: '11px', color: '#64748b'
      }).setOrigin(1, 0);

      this.shopBtns = {};
      Object.values(TOWERS).forEach((t, i) => {
        const x = 78 + i * 118;
        const box = this.add.rectangle(x, y + 36, 100, 92, 0x1e3a5f, 1)
          .setStrokeStyle(2, 0x2a3d57)
          .setInteractive({ useHandCursor: true });
        this.add.image(x, y + 12, t.sprite).setDisplaySize(34, 52);
        this.add.text(x, y + 52, t.name, { fontSize: '13px', fontStyle: 'bold', color: '#e2e8f0' }).setOrigin(0.5);
        this.add.text(x, y + 68, 'Quiz to place', { fontSize: '10px', color: '#94a3b8' }).setOrigin(0.5);
        box.on('pointerdown', (p) => {
          p.event.stopPropagation();
          this.selected = t.id;
          this.refreshShop();
        });
        this.shopBtns[t.id] = box;
      });
      this.refreshShop();
    }

    refreshHud() {
      this.waveText.setText(`Wave ${Math.min(this.wave, WAVES)}/${WAVES}`);
      this.bountyText.setText(`Bounty ${this.bounty}`);
      this.lifeText.setText(`♥ ${this.lives}`);
    }

    refreshShop() {
      Object.entries(this.shopBtns).forEach(([id, box]) => {
        const on = this.selected === id;
        box.setFillStyle(on ? 0x155e75 : 0x1e3a5f);
        box.setStrokeStyle(2, on ? 0x00d5ff : 0x2a3d57);
      });
    }

    onTap(pointer) {
      if (this.busy || this.ended) return;
      if (pointer.y > MAP_TOP + ROWS * TILE) return;
      const c = Math.floor((pointer.x - MAP_LEFT) / TILE);
      const r = Math.floor((pointer.y - MAP_TOP) / TILE);
      if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return;
      if (PATH_SET.has(`${c},${r}`)) return;

      const existing = this.towers.find((t) => t.c === c && t.r === r);
      if (existing) {
        this.askUpgrade(existing);
        return;
      }

      const spec = TOWERS[this.selected];
      this.askPlace(c, r, spec);
    }

    askPlace(c, r, spec) {
      const { x, y } = tileCenter(c, r);
      this.clearGhost();
      this.ghost = this.add.image(x, y, spec.sprite).setDisplaySize(30, 46).setAlpha(0.45);
      this.pending = { type: 'place', c, r, spec };
      this.askQuestion(`Place ${spec.name}?`, () => {
        this.placeTower(c, r, spec);
        this.flashHint(`${spec.name} deployed`);
      }, () => {
        this.flashHint('Wrong answer. Tower not placed.');
      });
    }

    askUpgrade(tower) {
      if (tower.level >= MAX_LEVEL) {
        this.flashHint(`${tower.spec.name} is max level`);
        this.towers.forEach((t) => t.ring.setVisible(false));
        tower.ring.setVisible(true);
        this.time.delayedCall(700, () => tower.ring.setVisible(false));
        return;
      }
      this.pending = { type: 'upgrade', tower };
      this.askQuestion(`Upgrade ${tower.spec.name} to Lv${tower.level + 1}?`, () => {
        this.upgradeTower(tower);
        this.flashHint(`${tower.spec.name} → Lv${tower.level}`);
      }, () => {
        this.flashHint('Wrong answer. No upgrade.');
      });
    }

    placeTower(c, r, spec) {
      const { x, y } = tileCenter(c, r);
      const ring = this.add.circle(x, y, spec.range, spec.color, 0.1);
      const sprite = this.add.image(x, y, spec.sprite).setDisplaySize(34, 52);
      const badge = this.add.text(x + 14, y - 22, '1', {
        fontSize: '10px', fontStyle: 'bold', color: '#0b0f19', backgroundColor: '#00d5ff', padding: { x: 3, y: 1 }
      }).setOrigin(0.5);
      ring.setVisible(false);
      sprite.setInteractive({ useHandCursor: true });
      const tower = { c, r, x, y, spec: { ...spec }, ring, sprite, badge, cooldown: 0, level: 1 };
      sprite.on('pointerdown', (p) => {
        p.event.stopPropagation();
        if (this.busy || this.ended) return;
        this.askUpgrade(tower);
      });
      this.towers.push(tower);
    }

    upgradeTower(tower) {
      tower.level += 1;
      tower.spec.dmg = Math.round(tower.spec.dmg * 1.28);
      tower.spec.range = Math.round(tower.spec.range * 1.12);
      tower.spec.rate = Math.max(220, Math.round(tower.spec.rate * 0.88));
      if (tower.spec.splash) tower.spec.splash = Math.round(tower.spec.splash * 1.1);
      tower.ring.setRadius(tower.spec.range);
      tower.badge.setText(String(tower.level));
      tower.ring.setVisible(true);
      this.time.delayedCall(700, () => tower.ring.setVisible(false));
    }

    clearGhost() {
      if (this.ghost) {
        this.ghost.destroy();
        this.ghost = null;
      }
    }

    flashHint(msg) {
      this.shopHints.setText(msg);
      this.time.delayedCall(1200, () => {
        if (this.shopHints && this.shopHints.active) {
          this.shopHints.setText('Answer a question to place');
        }
      });
    }

    nextWaveSoon(delay) {
      this.time.delayedCall(delay, () => this.startWave());
    }

    startWave() {
      if (this.ended) return;
      this.wave += 1;
      if (this.wave > WAVES) {
        this.finish(true);
        return;
      }
      this.waveHp = 20 + this.wave * 10;
      this.waveSpeed = 34 + this.wave * 3;
      this.waveKind = WAVE_MONSTERS[(this.wave - 1) % WAVE_MONSTERS.length];
      this.spawnLeft = 4 + this.wave;
      this.spawnTimer = 0;
      this.spawning = true;
      this.waveActive = true;
      this.refreshHud();
    }

    spawnEnemy() {
      const meta = MONSTERS[this.waveKind] || MONSTERS.homework;
      const start = this.waypoints[0];
      const hp = Math.round(this.waveHp * meta.hpMul);
      const body = this.add.circle(start.x, start.y, 13, 0xf87171, 1);
      const icon = this.add.text(start.x, start.y, meta.icon, { fontSize: '14px' }).setOrigin(0.5);
      const barBg = this.add.rectangle(start.x, start.y - 20, 22, 4, 0x3f1d1d);
      const bar = this.add.rectangle(start.x, start.y - 20, 22, 4, 0x4ade80);
      this.enemies.push({
        x: start.x,
        y: start.y,
        hp,
        maxHp: hp,
        baseSpeed: this.waveSpeed * meta.spdMul,
        speed: this.waveSpeed * meta.spdMul,
        slowUntil: 0,
        bounty: meta.bounty,
        wp: 0,
        body,
        icon,
        bar,
        barBg,
        dead: false
      });
    }

    update(_, delta) {
      if (this.ended || this.busy) return;
      const dt = Math.min(delta, 40) / 1000;
      const now = this.time.now;

      if (this.spawning) {
        this.spawnTimer -= delta;
        if (this.spawnTimer <= 0 && this.spawnLeft > 0) {
          this.spawnEnemy();
          this.spawnLeft -= 1;
          this.spawnTimer = Math.max(420, 900 - this.wave * 50);
        }
        if (this.spawnLeft <= 0) this.spawning = false;
      }

      this.updateEnemies(dt, now);
      this.updateTowers(delta);
      this.updateShots(dt);

      if (this.waveActive && !this.spawning && this.enemies.length === 0 && !this.ended) {
        this.onWaveCleared();
      }
    }

    updateEnemies(dt, now) {
      for (const e of this.enemies) {
        if (e.dead) continue;
        e.speed = now < e.slowUntil ? e.baseSpeed * 0.55 : e.baseSpeed;
        const target = this.waypoints[e.wp + 1];
        if (!target) {
          this.leak(e);
          continue;
        }
        const dx = target.x - e.x;
        const dy = target.y - e.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 3) {
          e.wp += 1;
          continue;
        }
        e.x += (dx / dist) * e.speed * dt;
        e.y += (dy / dist) * e.speed * dt;
        e.body.setPosition(e.x, e.y);
        e.icon.setPosition(e.x, e.y);
        e.barBg.setPosition(e.x, e.y - 20);
        e.bar.setPosition(e.x, e.y - 20);
        e.bar.width = 22 * (e.hp / e.maxHp);
      }
      this.sweepDead();
    }

    updateTowers(delta) {
      for (const t of this.towers) {
        t.cooldown -= delta;
        if (t.cooldown > 0) continue;
        const target = this.nearestEnemy(t);
        if (!target) continue;
        t.cooldown = t.spec.rate;
        this.fire(t, target);
      }
    }

    nearestEnemy(t) {
      let best = null;
      let bestD = t.spec.range;
      for (const e of this.enemies) {
        if (e.dead) continue;
        const d = Math.hypot(e.x - t.x, e.y - t.y);
        if (d <= bestD) {
          best = e;
          bestD = d;
        }
      }
      return best;
    }

    fire(tower, enemy) {
      const shot = this.add.circle(tower.x, tower.y, 4, tower.spec.shot, 1);
      this.shots.push({
        x: tower.x,
        y: tower.y,
        target: enemy,
        speed: tower.spec.id === 'sword' ? 420 : 320,
        dmg: tower.spec.dmg,
        splash: tower.spec.splash,
        slow: tower.spec.slow,
        gfx: shot
      });
    }

    updateShots(dt) {
      for (const s of this.shots) {
        if (!s.target || s.target.dead) {
          s.gone = true;
          continue;
        }
        const dx = s.target.x - s.x;
        const dy = s.target.y - s.y;
        const dist = Math.hypot(dx, dy) || 1;
        s.x += (dx / dist) * s.speed * dt;
        s.y += (dy / dist) * s.speed * dt;
        s.gfx.setPosition(s.x, s.y);
        if (dist < 10) {
          this.hit(s);
          s.gone = true;
        }
      }
      this.shots = this.shots.filter((s) => {
        if (!s.gone) return true;
        s.gfx.destroy();
        return false;
      });
    }

    hit(shot) {
      if (shot.splash > 0) {
        for (const e of this.enemies) {
          if (e.dead) continue;
          if (Math.hypot(e.x - shot.x, e.y - shot.y) <= shot.splash) {
            this.hurt(e, shot.dmg, shot.slow);
          }
        }
      } else if (shot.target && !shot.target.dead) {
        this.hurt(shot.target, shot.dmg, shot.slow);
      }
    }

    hurt(enemy, dmg, slow) {
      enemy.hp -= dmg;
      if (slow && slow < 1) enemy.slowUntil = this.time.now + 900;
      if (enemy.hp <= 0) this.kill(enemy);
    }

    kill(enemy) {
      enemy.dead = true;
      this.bounty += enemy.bounty;
      this.refreshHud();
      this.tweens.add({
        targets: [enemy.body, enemy.icon],
        alpha: 0,
        scale: 0.4,
        duration: 160
      });
    }

    leak(enemy) {
      enemy.dead = true;
      this.lives -= 1;
      this.refreshHud();
      if (this.lives <= 0) this.finish(false);
    }

    sweepDead() {
      this.enemies = this.enemies.filter((e) => {
        if (!e.dead) return true;
        e.body.destroy();
        e.icon.destroy();
        e.bar.destroy();
        e.barBg.destroy();
        return false;
      });
    }

    onWaveCleared() {
      this.waveActive = false;
      if (this.wave >= WAVES) {
        this.finish(true);
        return;
      }
      this.flashHint(`Wave ${this.wave} cleared`);
      this.nextWaveSoon(900);
    }

    showOverlay(id) {
      const el = document.getElementById(id);
      el.hidden = false;
      el.classList.add('open');
      el.style.display = 'flex';
    }

    hideOverlay(id) {
      const el = document.getElementById(id);
      el.hidden = true;
      el.classList.remove('open');
      el.style.display = 'none';
    }

    askQuestion(title, onYes, onNo) {
      if (this.busy) return;
      const q = QUESTIONS[this.qIndex % QUESTIONS.length];
      this.qIndex += 1;
      this.busy = true;
      document.getElementById('quiz-kicker').textContent = title;
      document.getElementById('quiz-q').textContent = q.q;
      const box = document.getElementById('quiz-answers');
      box.innerHTML = '';
      q.a.forEach((choice, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = choice;
        btn.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          this.hideOverlay('quiz');
          this.clearGhost();
          this.pending = null;
          this.busy = false;
          if (i === q.c) onYes();
          else onNo();
        });
        box.appendChild(btn);
      });
      this.showOverlay('quiz');
    }

    finish(won) {
      if (this.ended) return;
      this.ended = true;
      this.busy = true;
      this.hideOverlay('quiz');
      this.clearGhost();
      document.getElementById('end-title').textContent = won ? 'You passed!' : 'Study more';
      document.getElementById('end-msg').textContent = won
        ? `All ${WAVES} waves cleared. Bounty ${this.bounty}.`
        : `Reached wave ${this.wave}. Bounty ${this.bounty}. Answer more questions to place fighters.`;
      const btn = document.getElementById('end-btn');
      btn.onclick = (ev) => {
        ev.preventDefault();
        this.hideOverlay('end');
        this.scene.restart();
      };
      this.showOverlay('end');
    }
  }

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: W,
    height: H,
    backgroundColor: '#0b0f19',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [BootScene, MenuScene, GameScene]
  });
})();
