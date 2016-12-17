var math = require('mathjs')
var helper = require('./helper.js');

function RLBase(env, S, A, T)
{
    this.S = S;
    this.A = A;
    this.T = T;
    this.env = env;
    this.Q = null;
    this.V = null;
    this.Pi = null;
}

RLBase.prototype.index_of = function (state) {
    return this.env.index_of(state)
}

RLBase.prototype.init_V = function(init_value, is_random)
{
    if (is_random)
        this.V = math.matrix(math.random([this.S.length]))
    else
        this.V = math.multiply(init_value, math.ones(this.S.length));
}

RLBase.prototype.init_Q = function (init_value, is_random){
    if (is_random)
        this.Q = math.matrix(math.random([this.S.length, this.A.length]));
    else
        this.Q = math.multiply(init_value, math.ones(this.S.length, this.A.length));
}

RLBase.prototype.init_Pi = function (is_random) {
    M = new Array(this.numS);
    for (var i = 0; i < this.numS; i++) {
        if (isRandom)
            M[i] = helper.randomProbList(this.A.length);
        else
            M[i] = helper.nonRandomProbList(this.A.length);
    }
    this.Pi = math.matrix(M);
}

RLBase.prototype.Transition = function (state, action) {
    return this.env.Transition(state, action);
}

RLBase.prototype.Reward = function (state, next_state, action) {
    return this.env.Reward(state, next_state, action);
}

RLBase.prototype.init_state_in_episode = function (){
    return this.env.init_state_in_episode();
}

RLBase.prototype.generate_episode = function () {
    return this.env.generate_episode();
}

RLBase.prototype.choose_action = function (state, is_stochasitc, epsilon) {
    var r = math.random();
    if (r <= epsilon / 2) {
        idx = Math.floor(Math.random() * this.A.length)
        return this.A[idx];
    }
    else {
        // 这里可能考虑了pos，可能要独立一个函数来查index。
        var idx_state = this.index_of(state);
        var row = helper.getRowVector(this.Q, idx_state);
        var idx = helper.argmax(row);
        return this.A[idx];
    }
}

RLBase.prototype.Training = function () {

}

RLBase.prototype.GPI = function (iters, alpha, gamma, e, useQ){
    if (useQ)
        this.init_Q(0, false)
    else
        this.init_V(0, false)

    for (var i = 0; i < iters; i++) {
        console.log(i);
        var s = this.env.init_state_in_episode();
        var a = this.choose_action(s, false, e);
        
        while (!this.env.is_terminated(s)) {
            var _s = this.Transition(s, a);
            var _a = this.choose_action(_s, false, e);
            var r = this.Reward(s, _s, a);

            if (useQ)
                this.UpdateQ(s, _s, a, _a, r, alpha, gamma, e);
            else
                this.UpdateV(s, _s, a, _a, r, alpha, gamma, e);

            s = _s;
            a = _a;
        }
    }
}


function Episode() {
    this.episode_lst = new Array();
    this.terminate_state = null;
    this.state_list = new Array();
}

Episode.prototype.append = function (node) {
    this.episode_lst.push(node);
    this.state_list.push(node.S);
}

function EpisodeNode(state, action, r) {
    this.S = state
    this.a = action
    this.R = r
}

exports.RLBase = RLBase
exports.Episode = Episode
exports.EpisodeNode = EpisodeNode