import {PRESET, MODE} from './constants';

export default class Physics {
  constructor(config, ballPaddleCollisionCallback) {

    // config
    this.config = config;

    this.world = null;
    this.ball = null;
    this.net = null;
    this.ground = null;
    this.paddle = null;
    this.ballNetContact = null;
    this.ballGroundContact = null;
    this.ballPaddleContact = null;
    this.raycaster = new THREE.Raycaster();

    this.ballPaddleCollisionCallback = ballPaddleCollisionCallback;
  }

  setupWorld() {
    // world
    this.world = new CANNON.World();
    this.world.gravity.set(0, -this.config.gravity, 0);
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 20;
    this.setupBox();
    this.setupPaddle();
    this.setupNet();
    //this.net.collisionResponse = 0;
  }

  setupGround(){
    // ground
    this.ground = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Plane(),
      material: new CANNON.Material(),
    });
    this.ground.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),-Math.PI/2);
    this.world.add(this.ground);
  }

  setupNet() {
    // net
    this.net = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(
        new CANNON.Vec3(
          this.config.boxWidth / 2,
          this.config.netHeight / 2,
          this.config.netThickness / 2
        )
      ),
      material: new CANNON.Material(),
    });
    this.net._name = 'NET';
    this.net.position.set(
      0,
      this.config.netHeight / 2,
      this.config.boxPositionZ
    );
    this.world.add(this.net);
  }

  setupPaddle() {
    // paddle
    this.paddle = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(
        new CANNON.Vec3(
          this.config.paddleSize / 2,
          this.config.paddleSize / 2,
          this.config.paddleThickness / 2
        )
      ),
      material: new CANNON.Material(),
    });
    this.paddle._name = 'PADDLE';
    this.paddle.position.set(0, 1, this.config.paddlePositionZ);
    this.paddle.addEventListener('collide', this.paddleCollision.bind(this));
    this.world.add(this.paddle);
  }

  addContactMaterial(mat1, mat2, bounce, friction) {
     let contact = new CANNON.ContactMaterial(
      mat1,
      mat2,
      {friction: friction, restitution: bounce}
    );
    this.world.addContactMaterial(contact);
  }

  setupBox() {
    let wallWidth = 10;
    this.leftWall = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(
        new CANNON.Vec3(
          wallWidth / 2,
          this.config.boxHeight / 2,
          this.config.boxDepth / 2
        )
      ),
      material: new CANNON.Material(),
    });
    this.leftWall.position.set(
      -this.config.boxWidth / 2 - wallWidth / 2,
      this.config.boxHeight / 2,
      this.config.boxPositionZ
    );
    this.world.add(this.leftWall);

    this.rightWall = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(
        new CANNON.Vec3(
          wallWidth / 2,
          this.config.boxHeight / 2,
          this.config.boxDepth / 2
        )
      ),
      material: new CANNON.Material(),
    });
    this.rightWall.position.set(
      this.config.boxWidth / 2 + wallWidth / 2,
      this.config.boxHeight / 2,
      this.config.boxPositionZ
    );
    this.world.add(this.rightWall);

    this.bottomWall = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(
        new CANNON.Vec3(
          this.config.boxWidth * 2,
          wallWidth / 2,
          this.config.boxDepth / 2
        )
      ),
      material: new CANNON.Material(),
    });
    this.bottomWall.position.set(
      0,
      -wallWidth / 2,
      this.config.boxPositionZ
    );
    this.world.add(this.bottomWall);

    this.topWall = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(
        new CANNON.Vec3(
          this.config.boxWidth * 2,
          wallWidth / 2,
          this.config.boxDepth / 2
        )
      ),
      material: new CANNON.Material(),
    });
    this.topWall.position.set(
      0,
      this.config.boxHeight + wallWidth / 2,
      this.config.boxPositionZ
    );
    this.world.add(this.topWall);

    this.frontWall = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(
        new CANNON.Vec3(
          this.config.boxWidth * 2,
          this.config.boxHeight * 2,
          wallWidth / 2
        )
      ),
      material: new CANNON.Material(),
    });
    this.frontWall.position.set(
      0,
      this.config.boxHeight / 2,
      this.config.boxPositionZ - this.config.boxDepth / 2 - wallWidth / 2
    );
    this.world.add(this.frontWall);
  }

  addBall() {
    this.ball = new CANNON.Body({
      mass: this.config.ballMass,
      shape: new CANNON.Sphere(this.config.ballRadius),
      material: new CANNON.Material(),
    });

    this.ball.name = 'BALL';
    // TODO
    // newBall.linearDamping = 0.4;
    this.ball.linearDamping = 0;
    this.world.add(this.ball);

    this.addContactMaterial(this.ball.material, this.leftWall.material, this.config.ballBoxBounciness, 0);
    this.addContactMaterial(this.ball.material, this.topWall.material, this.config.ballBoxBounciness, 0);
    this.addContactMaterial(this.ball.material, this.rightWall.material, this.config.ballBoxBounciness, 0);
    this.addContactMaterial(this.ball.material, this.bottomWall.material, this.config.ballBoxBounciness, 0);
    this.addContactMaterial(this.ball.material, this.frontWall.material, this.config.ballBoxBounciness, 0);
    this.addContactMaterial(this.ball.material, this.paddle.material, 1, 0);

    this.initBallPosition(this.ball);
  }

  paddleCollision(e) {
    if (e.body.name === 'BALL') {
      this.ballPaddleCollisionCallback(e.body.position);

      let hitpointX = e.body.position.x - e.target.position.x;
      let hitpointY = e.body.position.y - e.target.position.y;
      // normalize to -1 to 1
      hitpointX = hitpointX / (this.config.paddleSize / 2);
      hitpointY = hitpointY / (this.config.paddleSize / 2);
      // did we hit the edge of the paddle?
      if (hitpointX > 1 || hitpointX < -1) return;
      if (hitpointY > 1 || hitpointY < -1) return;
      e.body.velocity.x = hitpointX * e.body.velocity.z * 0.7;
      e.body.velocity.y = hitpointY * e.body.velocity.z * 0.7;
      e.body.velocity.z += 0.1;
      console.log(this.config.preset);
      if (this.config.preset !== PRESET.PINGPONG) return;

      // these values are heavily tweakable
      e.body.velocity.x += hitpointX * 4;
      e.body.velocity.y = hitpointY * 0.7;
      if (this.config.mode === MODE.AGAINST_THE_WALL) {
        e.body.velocity.y = 5;
        e.body.velocity.z = 5;
      } else if (this.config.mode === MODE.HIT_THE_TARGET) {
        e.body.velocity.y *= 2 * e.body.velocity.z;
        e.body.velocity.z = (hitpointY + 0.5) * 7;
      } else {
        e.body.velocity.y *= 2 * e.body.velocity.z;
        e.body.velocity.z *= 4;
      }
    }
  }

  setPaddlePosition(x, y, z) {
    this.paddle.position.set(x, y, z);
  }

  setBallPosition(ball) {
    if (!this.ball) return;
    ball.position.copy(this.ball.position);
    ball.quaternion.copy(this.ball.quaternion);
  }

  initBallPosition(ball) {
    ball.position.set(0, this.config.boxHeight / 2, this.config.boxPositionZ);
    ball.velocity.x = this.config.ballInitVelocity * (0.5 - Math.random()) * 0.01;
    ball.velocity.y = this.config.ballInitVelocity * (0.5 - Math.random()) * 0.01;
    ball.velocity.z = this.config.ballInitVelocity * 2.0;
    ball.angularVelocity.x = 0;
    ball.angularVelocity.y = 0;
    ball.angularVelocity.z = 0;
    return;
    switch (this.config.mode) {
      case MODE.ONE_ON_ONE:
        ball.position.set(0, 1, this.config.boxDepth * -0.8);
        ball.velocity.x = this.config.ballInitVelocity * (0.5 - Math.random()) * 0.2;
        ball.velocity.y = this.config.ballInitVelocity * 2.5;
        ball.velocity.z = this.config.ballInitVelocity * 6.0;
        ball.angularVelocity.x = 0;
        ball.angularVelocity.y = 0;
        ball.angularVelocity.z = 0;
        break;
      case MODE.TOO_MANY_BALLS:
        ball.position.set(0, 1, this.config.boxDepth * -0.8);
        ball.velocity.x = this.config.ballInitVelocity * (0.5 - Math.random()) * 0.5;
        ball.velocity.y = this.config.ballInitVelocity * 2.5;
        ball.velocity.z = this.config.ballInitVelocity * 6.0;
        ball.angularVelocity.x = 0;
        ball.angularVelocity.y = 0;
        ball.angularVelocity.z = 0;
        break;
      case MODE.HIT_THE_TARGET:
        ball.position.set(0, 1, this.config.boxDepth * -0.5);
        ball.velocity.x = this.config.ballInitVelocity * (0.5 - Math.random()) * 0.2;
        ball.velocity.y = this.config.ballInitVelocity * 2.5;
        ball.velocity.z = this.config.ballInitVelocity * 5.0;
        ball.angularVelocity.x = 0;
        ball.angularVelocity.y = 0;
        ball.angularVelocity.z = 0;
        break;
      case MODE.AGAINST_THE_WALL:
        ball.position.set(0, 1.4, this.config.boxPositionZ + 0.01);
        ball.velocity.x = this.config.ballInitVelocity * (0.5 - Math.random()) * 0.1;
        ball.velocity.y = this.config.ballInitVelocity * -4;
        ball.velocity.z = this.config.ballInitVelocity * 2.0;
        ball.angularVelocity.x = 0;
        ball.angularVelocity.y = 0;
        ball.angularVelocity.z = 0;
        break;
      default:
        break;
    }
  }

  predictCollisions(paddle, net) {
    if (!this.ball) return;
    // predict ball position in the next frame
    this.raycaster.set(this.ball.position.clone(), this.ball.velocity.clone().unit());
    this.raycaster.far = this.ball.velocity.clone().length() / 50;

    // the raycaster only intersects visible objects, so if the net is invisible
    // in non-pingpong-mode, it wont get an intersection
    let arr = this.raycaster.intersectObjects([paddle, net]);
    if (arr.length) {
      this.ball.position.copy(arr[0].point);
    }
  }

  setMode(mode) {
    this.config.mode = mode;
  }

  step(delta) {
    this.world.step(delta);
  }

  getBallPosition() {
  }
}
