(() => {
  const W = 390;
  const H = 780;
  const COLS = 9;
  const ROWS = 12;
  const MAP_TOP = 78;
  const TILE = 40;
  const MAP_LEFT = (W - COLS * TILE) / 2;
  const WAVES = 8;
  const START_GOLD = 200;
  const START_LIVES = 15;

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

  const TOWERS = {
    pencil: { id: 'pencil', name: 'Pencil', icon: '✏️', cost: 50, dmg: 14, range: 100, rate: 420, color: 0xf4c430, splash: 0 },
    book: { id: 'book', name: 'Book', icon: '📘', cost: 90, dmg: 26, range: 120, rate: 640, color: 0x4ea8de, splash: 0 },
    calc: { id: 'calc', name: 'Calc', icon: '🧮', cost: 140, dmg: 18, range: 108, rate: 860, color: 0x34d399, splash: 52 }
  };

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

  class MenuScene extends Phaser.Scene {
    constructor() {
      super('menu');
    }

    create() {
      this.cameras.main.setBackgroundColor('#0b0f19');
      this.add.text(W / 2, 150, '📚', { fontSize: '64px' }).setOrigin(0.5);
      this.add.text(W / 2, 230, 'STUDY DEFENSE', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '34px',
        fontStyle: 'bold',
        color: '#00d5ff'
      }).setOrigin(0.5);

      this.add.text(W / 2, 290, 'An educational tower defense.\nPlace study tools. Stop the exam rush.\nAnswer bonus questions for gold.', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
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

      this.add.text(W / 2, 540, '1. Pick a tool at the bottom\n2. Tap a grass tile to place it\n3. Survive 8 waves', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
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
      this.gold = START_GOLD;
      this.lives = START_LIVES;
      this.wave = 0;
      this.selected = 'pencil';
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
      this.waypoints = pathPoints();

      this.drawMap();
      this.buildHud();
      this.buildShop();
      this.input.on('pointerdown', this.onTap, this);
      this.nextWaveSoon(600);
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
          if (!path) {
            g.fillStyle(0x1c3d2d, 1);
            g.fillCircle(x + TILE / 2, y + 11, 2);
          }
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
      this.goldText = this.add.text(W / 2, 36, '', { fontSize: '15px', fontStyle: 'bold', color: '#fbbf24' }).setOrigin(0.5);
      this.lifeText = this.add.text(W - 24, 36, '', { fontSize: '15px', fontStyle: 'bold', color: '#fb7185' }).setOrigin(1, 0.5);
      this.refreshHud();
    }

    buildShop() {
      const y = 668;
      this.add.rectangle(W / 2, y + 28, W - 16, 148, 0x122033, 1).setStrokeStyle(1, 0x2a3d57);
      this.add.text(24, y - 28, 'TOOLS', { fontSize: '12px', fontStyle: 'bold', color: '#00d5ff' });
      this.shopHints = this.add.text(W - 24, y - 28, 'Tap a tool, then a grass tile', {
        fontSize: '11px', color: '#64748b'
      }).setOrigin(1, 0);

      this.shopBtns = {};
      Object.values(TOWERS).forEach((t, i) => {
        const x = 78 + i * 118;
        const box = this.add.rectangle(x, y + 36, 100, 92, 0x1e3a5f, 1)
          .setStrokeStyle(2, 0x2a3d57)
          .setInteractive({ useHandCursor: true });
        this.add.text(x, y + 8, t.icon, { fontSize: '26px' }).setOrigin(0.5);
        this.add.text(x, y + 38, t.name, { fontSize: '13px', fontStyle: 'bold', color: '#e2e8f0' }).setOrigin(0.5);
        this.add.text(x, y + 58, `$${t.cost}`, { fontSize: '12px', color: '#fbbf24' }).setOrigin(0.5);
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
      this.goldText.setText(`Gold ${this.gold}`);
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
      if (this.towers.some((t) => t.c === c && t.r === r)) return;

      const spec = TOWERS[this.selected];
      if (this.gold < spec.cost) {
        this.flashHint('Not enough gold');
        return;
      }
      this.gold -= spec.cost;
      this.placeTower(c, r, spec);
      this.refreshHud();
    }

    placeTower(c, r, spec) {
      const { x, y } = tileCenter(c, r);
      const ring = this.add.circle(x, y, spec.range, spec.color, 0.08);
      const body = this.add.circle(x, y, 15, spec.color, 1);
      const icon = this.add.text(x, y, spec.icon, { fontSize: '16px' }).setOrigin(0.5);
      ring.setVisible(false);
      body.setInteractive({ useHandCursor: true });
      body.on('pointerdown', (p) => {
        p.event.stopPropagation();
        this.towers.forEach((t) => t.ring.setVisible(false));
        ring.setVisible(true);
        this.time.delayedCall(700, () => ring.setVisible(false));
      });
      this.towers.push({
        c, r, x, y, spec, ring, body, icon, cooldown: 0
      });
    }

    flashHint(msg) {
      this.shopHints.setText(msg);
      this.time.delayedCall(900, () => {
        if (this.shopHints && this.shopHints.active) {
          this.shopHints.setText('Tap a tool, then a grass tile');
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
      this.waveKind = this.wave % 3 === 0 ? 'exam' : this.wave % 2 === 0 ? 'quiz' : 'homework';
      this.spawnLeft = 4 + this.wave;
      this.spawnTimer = 0;
      this.spawning = true;
      this.waveActive = true;
      this.refreshHud();
    }

    spawnEnemy() {
      const kind = this.waveKind;
      const meta = {
        homework: { icon: '📝', label: 'HW', hpMul: 1.2, spdMul: 0.85, gold: 6 },
        quiz: { icon: '❓', label: 'Quiz', hpMul: 1, spdMul: 1, gold: 8 },
        exam: { icon: '📄', label: 'Exam', hpMul: 0.8, spdMul: 1.25, gold: 10 }
      }[kind];
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
        speed: this.waveSpeed * meta.spdMul,
        gold: meta.gold,
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

      if (this.spawning) {
        this.spawnTimer -= delta;
        if (this.spawnTimer <= 0 && this.spawnLeft > 0) {
          this.spawnEnemy();
          this.spawnLeft -= 1;
          this.spawnTimer = Math.max(420, 900 - this.wave * 50);
        }
        if (this.spawnLeft <= 0) this.spawning = false;
      }

      this.updateEnemies(dt);
      this.updateTowers(delta);
      this.updateShots(dt);

      if (this.waveActive && !this.spawning && this.enemies.length === 0 && !this.ended) {
        this.onWaveCleared();
      }
    }

    updateEnemies(dt) {
      for (const e of this.enemies) {
        if (e.dead) continue;
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
      const shot = this.add.circle(tower.x, tower.y, 4, 0xfff1a8, 1);
      this.shots.push({
        x: tower.x,
        y: tower.y,
        target: enemy,
        speed: 320,
        dmg: tower.spec.dmg,
        splash: tower.spec.splash,
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
            this.hurt(e, shot.dmg);
          }
        }
      } else if (shot.target && !shot.target.dead) {
        this.hurt(shot.target, shot.dmg);
      }
    }

    hurt(enemy, dmg) {
      enemy.hp -= dmg;
      if (enemy.hp <= 0) this.kill(enemy);
    }

    kill(enemy) {
      enemy.dead = true;
      this.gold += enemy.gold;
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
      this.busy = true;
      this.gold += 20 + this.wave * 4;
      this.refreshHud();
      if (this.wave >= WAVES) {
        this.finish(true);
        return;
      }
      this.time.delayedCall(350, () => this.offerQuiz());
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

    offerQuiz() {
      const q = QUESTIONS[(this.wave - 1) % QUESTIONS.length];
      const quiz = document.getElementById('quiz');
      const box = document.getElementById('quiz-answers');
      document.getElementById('quiz-q').textContent = q.q;
      box.innerHTML = '';
      quiz.style.display = 'flex';
      q.a.forEach((choice, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = choice;
        btn.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          this.hideOverlay('quiz');
          if (i === q.c) {
            this.gold += 40;
            this.flashHint('Correct! +40 gold');
          } else {
            this.flashHint('Nice try. Next wave!');
          }
          this.refreshHud();
          this.busy = false;
          this.nextWaveSoon(700);
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
      document.getElementById('end-title').textContent = won ? 'You passed!' : 'Study more';
      document.getElementById('end-msg').textContent = won
        ? `All ${WAVES} waves cleared. The exam rush is over.`
        : `Reached wave ${this.wave}. Place more tools and try again.`;
      const end = document.getElementById('end');
      end.style.display = 'flex';
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
    scene: [MenuScene, GameScene]
  });
})();
