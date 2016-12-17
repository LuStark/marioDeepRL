var rlbase = require('./RLBase.js')

function Q_Learning(env, S, A, T) {
    this.prototype = new rlbase.RLBase(env, S, A, T);
    this.Training = function (){
        this.GPI(4000, 0.5, 0.5, 0.8, true);
    }
    this.UpdateQ = function (s, _s, a, _a, r, alpha, gamma, e) {
        var PRO = this.prototype
        var a_star = PRO.choose_action(_s, false, 0)
        var i = PRO.index_of(s), j = PRO.A.indexOf(a)
        var _i = PRO.index_of(_s), _j = PRO.A.indexOf(a_star)
        PRO.Q._data[i][j] += alpha * (r + gamma * PRO.Q._data[_i][_j] - PRO.Q._data[i][j])
    }
}

Q_Learning.prototype.UpdateV = function (s, _s, a, _a, r, alpha, gamma, e){

}

Q_Learning.prototype.GPI = function (iters, alpha, gamma, e) {
    var PRO = this.prototype
    PRO.init_Q(0, false)
    var min_reward = -100000
    for (var i = 0; i < iters; i++) {
        console.log(i)
        var s = PRO.init_state_in_episode()
        var a = PRO.choose_action(s, false, e)
        
        var episode = new rlbase.Episode();

        var R = 0;
        while (!PRO.env.is_terminated(s)) {
            var _s = PRO.Transition(s, a)
            var _a = PRO.choose_action(_s, false, e)
            var r = PRO.Reward(s, _s, a)
            
            this.UpdateQ(s, _s, a, _a, r, alpha, gamma, e)
            
            episode.append(new rlbase.EpisodeNode(s, a, r))
            
            s = _s;
            a = _a;
            R += r;
        }
        episode.append(new rlbase.EpisodeNode(s, '', 0))
        episode.terminate_state = s
        if (R > min_reward) {
            PRO.env.episode = episode
            min_reward = R
        }
    }
}

exports.QL = Q_Learning