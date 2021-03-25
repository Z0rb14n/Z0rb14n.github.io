class Vector {
    x = 0;
    y = 0;
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    get magSq() {
        return this.x*this.x+this.y*this.y;
    }
    get mag() {
        return Math.sqrt(this.magSq);
    }
    get heading() {
        return Math.atan2(this.y,this.x);
    }
    div(scalar) {
        return new Vector(this.x / scalar, this.y/scalar);
    }
    get normalized() {
        var c = this.magSq;
        if (c != 0 || c != 1) return this.div(Math.sqrt(c));
        return this;
    }
    get array() {
        return [this.x,this.y];
    }
    copy() {
        return new Vector(this.x,this.y);
    }
    add(x,y) {
        if (typeof y !== "undefined") return new Vector(this.x+x,this.y+y);
        else return new Vector(this.x + x.x,this.y + x.y);
    }
    sub(x,y) {
        if (typeof y !== "undefined") return new Vector(this.x-x,this.y-y);
        else return new Vector(this.x - x.x,this.y - x.y);
    }
    mult(scalar) {
        return new Vector(this.x * scalar, this.y * scalar);
    }
    dist(x,y) {
        if (typeof y !== "undefined") {
            var dx = x - this.x;
            var dy = y - this.y;
            return Math.sqrt(dx*dx+dy*dy);
        } else {
            var dx = x.x - this.x;
            var dy = x.y - this.y;
            return Math.sqrt(dx*dx+dy*dy);
        }
    }
    dot(vector) {
        return this.x*vector.x + this.y*vector.y;
    }
    clampMag(max) {
        if (this.magSq > max*max) {
            return this.normalized.mult(max);
        }
        return this;
    }
    toMag(mag) {
        return this.normalized.mult(mag);
    }
    rotate(angle) {
        var temp = this.x;
        var x = (x * Math.cos(angle) - y * Math.sin(angle));
        var y = (temp * Math.sin(angle) + y*Math.cos(angle));
        return new Vector(x,y);
    }
    equals(v) {
        return this.x === v.x && this.y === v.y;
    }
    static fromAngle(angle) {
        return new Vector(Math.cos(angle),Math.sin(angle));
    }
    static random2D() {
        return Vector.fromAngle((Math.random()-0.5) * Math.PI * 2)
    }
    static lerp(v1,v2,amt) {
        var x = (v2.x - v1.x) * amt + v1.x;
        var y = (v2.y - v1.y) * amt + v1.y;
        return new Vector(x,y);
    }
    static angleBetween(v1,v2) {
        if (v1.x == 0 && v1.y == 0) return 0;
        if (v2.x == 0 && v2.y == 0) return 0;
        var amt = v1.dot(v2) / (v1.mag * v2.mag); // between -1 and 1
        if (amt <= -1) { // check bounds
            return Math.PI;
        } else if (amt >= 1) {
            return 0;
        }
        return Math.acos(amt); // dot = ||a|| * ||b|| * cos(angleBetween)
    }
}
