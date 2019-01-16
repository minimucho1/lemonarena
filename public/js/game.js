var config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
      default: 'arcade',
      arcade: {
          gravity: { y: 300 },
          debug: false
      }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  },
  parent: document.getElementById('game')
};

var game = new Phaser.Game(config);

var platforms;
var score = 0;
var scoreText;
var stars;
var bombs;
var gameOverText;
var players = {};

function preload() {
  this.load.image('sky', 'assets/sky.png');
  this.load.image('ground', 'assets/platform.png');
  this.load.image('star', 'assets/star.png');
  this.load.image('bomb', 'assets/bomb.png');
  this.load.spritesheet(
    'dude', 
    'assets/dude.png',
    { frameWidth: 32, frameHeight: 48 }
  );
};



function addPlayer(self, playerInfo) {
  self.player = self.physics.add.sprite(playerInfo.x, playerInfo.y, 'dude');
  self.player.facingRight = true;
  self.player.projectile = playerInfo.projectile;
  self.player.setCollideWorldBounds(true);
  self.player.lastShot = 0;
  self.player.shotInterval = 500;
  self.physics.add.collider(self.player, platforms);
  if (playerInfo.team === 'blue') {
    self.player.setTint(0x0000ff);
  } else {
    self.player.setTint(0xff0000);
  }
  self.player.fireProjectile = function(self, time) {
    if (time < this.lastShot + this.shotInterval) return;
    this.lastShot = time;
    const projectile = self.physics.add.sprite(this.x, this.y, this.projectile);
    this.facingRight ? projectile.setVelocityX(500) : projectile.setVelocityX(-500);
  };
};

function addOtherPlayers(self, playerInfo) {
  const otherPlayer = self.physics.add.sprite(playerInfo.x, playerInfo.y, 'dude');
  otherPlayer.facingRight = true;
  otherPlayer.setCollideWorldBounds(true);
  if (playerInfo.team === 'blue') {
    otherPlayer.setTint(0x0000ff);
  } else {
    otherPlayer.setTint(0xff0000);
  }
  otherPlayer.playerId = playerInfo.playerId;
  self.otherPlayers.add(otherPlayer);
};

function create() {
  var self = this;

  function setupScene(self) {
    self.add.image(400, 300, 'sky');

    platforms = self.physics.add.staticGroup();

    platforms.create(400, 568, 'ground').setScale(2).refreshBody();

    platforms.create(600, 400, 'ground');
    platforms.create(50, 250, 'ground');
    platforms.create(750, 220, 'ground');
  };

  setupScene(self);
  
  self.socket = io();
  self.otherPlayers = this.physics.add.group();
  self.projectiles = this.physics.add.group();

  // io handler to add a player when a player connects
  self.socket.on('currentPlayers', function(players) {
    Object.keys(players).forEach(function (id) {
      if (players[id].playerId === self.socket.id) {
        addPlayer(self, players[id]);
      } else {
        addOtherPlayers(self, players[id]);
      }
    });
  });

  // io handler add a player when a player connects
  self.socket.on('newPlayer', function (playerInfo) {
    addOtherPlayers(self, playerInfo);
  });

  // io handle player disconnect
  self.socket.on('disconnect', function (playerId) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerId === otherPlayer.playerId) {
        otherPlayer.destroy();
      }
    });
  });

  // io handle remote player movements
  self.socket.on('playerMoved', function (playerInfo) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerInfo.playerId === otherPlayer.playerId) {
        otherPlayer.facingRight = playerInfo.facingRight;
        otherPlayer.setPosition(playerInfo.x, playerInfo.y);
        if (otherPlayer.facingRight) { 
          otherPlayer.anims.play('right', true);
        } else {
          otherPlayer.anims.play('left', true);
        }
      }
    });
  });

  self.anims.create({
    key: 'left',
    frames: self.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
    frameRate: 10,
    repeat: -1
  });

  self.anims.create({
      key: 'right',
      frames: self.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
      frameRate: 10,
      repeat: -1
  });
  
  self.cursors = this.input.keyboard.createCursorKeys();
  self.spaceBars = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  self.physics.add.collider(self.otherPlayers, platforms);

  // cursors = this.input.keyboard.createCursorKeys();

  // stars = this.physics.add.group({
  //     key: 'star',
  //     repeat: 11,
  //     setXY: { x: 12, y: 0, stepX: 70 }
  // });

  // stars.children.iterate(function (child) {
  //     child.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
  // });

  // this.physics.add.collider(stars, platforms);

  // bombs = this.physics.add.group();

  // function collectStar (player, star) {
  //     star.disableBody(true, true);
  //     score += 10;
  //     scoreText.setText('Score: ' + score);

  //     if (stars.countActive(true) === 0) {
  //         stars.children.iterate(function (child) {
  //             child.enableBody(true, child.x, 0, true, true);
  //         });

  //         var x = (player.x < 400) ? Phaser.Math.Between(400, 800) : Phaser.Math.Between(0, 400);

  //         var bomb = bombs.create(x, 16, 'bomb');
  //         bomb.setBounce(1);
  //         bomb.setCollideWorldBounds(true);
  //         bomb.setVelocity(Phaser.Math.Between(-200, 200), 20);
  //         bomb.allowGravity = false;
  //     }
  // }

  // this.physics.add.overlap(player, stars, collectStar, null, this);

  // scoreText = this.add.text(16, 16, 'score: 0', { fontSize: '32px', fill: '#000' });

  // this.physics.add.collider(bombs, platforms);

  // function hitBomb (player, bomb){
  //     this.physics.pause();
  //     player.setTint(0xff0000);
  //     player.anims.play('turn');
  //     gameOver = true;
  //     // scoreText.disableBody
  //     gameOverText = this.add.text(200, 200, `GAME OVER\nScore: ${score}`, { fontSize: '62px', fill: '#000' })
  // }
}

function update (time) {
  var self = this;
  // if (cursors.left.isDown) {
  //     player.setVelocityX(-160);

      // player.anims.play('left', true);
  // }
  // else if (cursors.right.isDown) {
  //     player.setVelocityX(160);

  //     player.anims.play('right', true);
  // }
  // else {
  //     player.setVelocityX(0);

  //     player.anims.play('turn');
  // }

  // if (cursors.up.isDown && player.body.touching.down) {
  //     player.setVelocityY(-330);
  // }

  if (self.player) {
    // emit player movement
    var x = self.player.x;
    var y = self.player.y;
    var facingRight = self.player.facingRight;
    if (self.player.oldPosition && (x !== self.player.oldPosition.x || y !== self.player.oldPosition.y || facingRight !== self.player.oldPosition.facingRight)) {
      this.socket.emit('playerMovement', { x: self.player.x, y: self.player.y, facingRight: self.player.facingRight });
    }

    // save old position data
    self.player.oldPosition = {
      x: self.player.x,
      y: self.player.y,
      facingRight: self.player.facingRight
    };

    if (self.cursors.left.isDown) {
      self.player.setVelocityX(-150);
      self.player.facingRight = false;
      self.player.anims.play('left', true);
    } else if (self.cursors.right.isDown) {
      self.player.setVelocityX(150);
      self.player.facingRight = true;
      self.player.anims.play('right', true);
    } else {
      self.player.setVelocityX(0);
    }
  
    if (self.cursors.up.isDown && self.player.body.touching.down) {
      self.player.setVelocityY(-330);
    }

    if (self.spaceBars.isDown) {
      self.player.fireProjectile(self, time);
      self.socket.emit('playerFire', { x: self.player.x, y: self.player.y, facingRight: self.player.facingRight });
    }
  
    self.physics.world.wrap(self.player, 5);
  }
}
