import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hitBrick, reflectPaddle } from '../docs/physics.mjs';
test('paddle sends the ball upward without changing its speed',()=>{for(const x of [100,150,200]){const ball={x,vx:0,vy:300};reflectPaddle(ball,{x:100,w:100},330);assert.ok(ball.vy<0);assert.ok(Math.abs(Math.hypot(ball.vx,ball.vy)-330)<.001);}});
test('top and side impacts reflect the correct velocity component',()=>{const brick={x:20,y:20,w:15,h:16,alive:true};const top={x:25,y:18,r:5,vx:10,vy:100};assert.ok(hitBrick(top,brick,25,10));assert.equal(top.vy,-100);assert.equal(top.vx,10);const side={x:17,y:26,r:5,vx:100,vy:10};assert.ok(hitBrick(side,brick,10,26));assert.equal(side.vx,-100);assert.equal(side.vy,10);});
test('destroyed and distant bricks do not collide',()=>{const ball={x:25,y:18,r:5,vx:10,vy:100};assert.equal(hitBrick(ball,{x:20,y:20,w:15,h:16,alive:false},25,10),false);assert.equal(hitBrick(ball,{x:200,y:200,w:15,h:16,alive:true},25,10),false);});
