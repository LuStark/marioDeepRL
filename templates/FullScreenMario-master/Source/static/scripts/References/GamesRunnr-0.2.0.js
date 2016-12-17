/// <reference path="FPSAnalyzr-0.2.1.ts" />
var GamesRunnr;

var MarioEvent = {
    NONE: 0,
    KILL: 1,
    POWERUP: 2,
    POWERDOWN: 3,
    DIED: 4,
    RICH: 5,
    XUMIN: 6, // 没有硬点的意思，一点也没有
    PASS: 7,  //通关的意思
};

var objidx_mapper = {
    " ": 0, "M": 1, "block_Coin": 2, "block_Mushroom": 3, "pipe": 4,
    "floor": 5, "block_Mushroom1Up": 6, "Mushroom": 7, "Goomba": 8,
    "stone": 9, "ravine": 10, "Mushroom1Up": 11, "Shell": 12,
    "brick": 13, "coin": 14, "FireFlower": 15, "Koopa": 16
};

var NewAction = {
    RIGHT_UP : 0,
    RIGHT_DOWN : 1,
    LEFT_UP : 2,
    LEFT_DOWN : 3,
    UP_UP : 4,
    UP_DOWN : 5,
    STOP : 6,
    NONE : 7,
}

function MarioAction(gamesRunnr, A, type) {
    this.A = A;
    this.type = type;
    this.run = function() {
        if (this.A == null)
            return;

        if (gamesRunnr.count < this.A.length)
        {
            switch (this.A[gamesRunnr.count])
            {
            case NewAction.RIGHT_UP:
                FSM.keyUpRight(FSM, null);
                break;
            case NewAction.RIGHT_DOWN:
                FSM.keyDownRight(FSM, null);
                break;
            case NewAction.LEFT_UP:
                FSM.keyUpLeft(FSM, null);
                break;
            case NewAction.LEFT_DOWN:
                FSM.keyDownLeft(FSM, null);
                break;
            case NewAction.UP_UP:
                FSM.keyUpUp(FSM, null);
                break;
            case NewAction.UP_DOWN:
                FSM.keyDownUp(FSM, null);
                break;
            case NewAction.STOP:
                FSM.player.keys.run = 0;
                FSM.player.keys.rightDown = false;
                FSM.player.keys.leftDown = false;
                FSM.player.keys.crouch = false;
                FSM.player.canjump = true;
                break;
            case NewAction.NONE:
                break;
            }
            gamesRunnr.count++;
        }
    }


    this.is_done = function() {
        return this.A.length <= gamesRunnr.count;
    }

    this.reset = function() {
        gamesRunnr.count = 0;
    }
}



var block_length = 1;    //每个格子代表的屏幕像素数目。

(function (GamesRunnr_1) {
    "use strict";
    /**
     * A class to continuously series of "game" Functions. Each game is run in a
     * set order and the group is run as a whole at a particular interval, with a
     * configurable speed. Playback can be triggered manually, or driven by a timer
     * with pause and play hooks. For automated playback, statistics are
     * available via an internal FPSAnalyzer.
     */
    var GamesRunnr = (function () {
        /**
         * Initializes a new instance of the GamesRunnr class.
         *
         * @param settings   Settings to be used for initialization.
         */
        function GamesRunnr(settings) {
            if (typeof settings === "undefined") {
                throw new Error("No settings object given GamesRunnr.");
            }
            if (typeof settings.games === "undefined") {
                throw new Error("No games given to GamesRunnr.");
            }
            var i;
            this.games = settings.games;
            this.interval = settings.interval || 1000 / 60;
            this.speed = settings.speed || 1;
            this.onPause = settings.onPause;
            this.onPlay = settings.onPlay;
            this.callbackArguments = settings.callbackArguments || [this];
            this.adjustFramerate = settings.adjustFramerate;
            this.FPSAnalyzer = settings.FPSAnalyzer || new FPSAnalyzr.FPSAnalyzr(settings.FPSAnalyzerSettings);
            this.scope = settings.scope || this;
            this.paused = true;
            this.upkeepScheduler = settings.upkeepScheduler || function (handler, timeout) {
                return setTimeout(handler, timeout);
            };
            this.upkeepCanceller = settings.upkeepCanceller || function (handle) {
                clearTimeout(handle);
            };
            this.upkeepBound = this.upkeep.bind(this);
            for (i = 0; i < this.games.length; i += 1) {
                this.games[i] = this.games[i].bind(this.scope);
            }
            this.setIntervalReal();

            this.count = 0;
            this.init_actions();
            this.init_state();
            this.init_connection();
        }

        /* Gets
        */
        /**
         * @returns The FPSAnalyzer used in the GamesRunnr.
         */
        GamesRunnr.prototype.getFPSAnalyzer = function () {
            return this.FPSAnalyzer;
        };
        /**
         * @returns Whether this is paused.
         */
        GamesRunnr.prototype.getPaused = function () {
            return this.paused;
        };
        /**
         * @returns The Array of game Functions.
         */
        GamesRunnr.prototype.getGames = function () {
            return this.games;
        };
        /**
         * @returns The interval between upkeeps.
         */
        GamesRunnr.prototype.getInterval = function () {
            return this.interval;
        };
        /**
         * @returns The speed multiplier being applied to the interval.
         */
        GamesRunnr.prototype.getSpeed = function () {
            return this.speed;
        };
        /**
         * @returns The optional trigger to be called on pause.
         */
        GamesRunnr.prototype.getOnPause = function () {
            return this.onPause;
        };
        /**
         * @returns The optional trigger to be called on play.
         */
        GamesRunnr.prototype.getOnPlay = function () {
            return this.onPlay;
        };
        /**
         * @returns Arguments to be given to the optional trigger Functions.
         */
        GamesRunnr.prototype.getCallbackArguments = function () {
            return this.callbackArguments;
        };
        /**
         * @returns Function used to schedule the next upkeep.
         */
        GamesRunnr.prototype.getUpkeepScheduler = function () {
            return this.upkeepScheduler;
        };
        /**
         * @returns {Function} Function used to cancel the next upkeep.
         */
        GamesRunnr.prototype.getUpkeepCanceller = function () {
            return this.upkeepCanceller;
        };
        /* Runtime
        */
        /**
         * Meaty function, run every <interval*speed> milliseconds, to mark an FPS
         * measurement and run every game once.
         */

        GamesRunnr.prototype.collect_group_info = function () {
            var characters = FSM.GroupHolder.getGroup("Character")
            var solids = FSM.GroupHolder.getGroup("Solid")
            var player = FSM.player;

            var enemys = []
            var foods = []
            var coins = []

            var nearest_dist = 100000;
            var nearest_character = null;

            for (var i = 0; i < characters.length; i++) {
                if (characters[i].used == true)
                    continue;
                var obj = {};
                var title = characters[i].title;

                obj["left"] = characters[i].left;
                obj["right"] = characters[i].right;
                obj["width"] = obj["right"] - obj["left"];

                obj["top"] = characters[i].top;
                obj["bottom"] = characters[i].bottom;
                obj["height"] = obj["bottom"] - obj["top"];

                if (Math.abs(obj.left-player.left) < nearest_dist)
                {
                    nearest_dist = Math.abs(obj.left-player.left);
                    nearest_character = obj;
                }

                if (title == "Goomba" || title == "Koopa" || title == "Shell") {
                    obj["name"] = title;
                    enemys.push(obj);
                } else if (title.startsWith("Mushroom")|| title == "FireFlower"|| title == "Star") {
                    obj["name"] = title;
                    foods.push(obj);
                } else if (title == "Coin") {
                    obj["name"] = title;
                    coins.push(obj);
                }
            }

            var coinblocks = []
            var foodblocks = []
            var bricks = []
            var pipes = []
            var stones = []
            var floors = []

            for (var i = 0; i < solids.length; i++) {
                var obj = {}
                var title = solids[i].title

                try {
                    obj["left"] = solids[i].left;
                }
                catch (error) {
                    var j = 0
                    j = 1
                }

                obj["right"] = solids[i].right;
                obj["width"] = obj["right"] - obj["left"];

                obj["top"] = solids[i].top;
                obj["bottom"] = solids[i].bottom;
                obj["height"] = obj["bottom"] - obj["top"];

                if (solids[i].used == true || title == "Brick")
                {
                    // used as brick
                    obj["name"] = "brick";
                    bricks.push(obj);
                    continue;
                }

                if (title == "Block") {
                    if (solids[i].contents != null) {
                        obj["contains"] = solids[i].contents
                        if (solids[i].contents == "Coin") {
                            coinblocks.push(obj)
                        } else {
                            foodblocks.push(obj)
                        }
                        obj["name"] = "block_" + obj["contains"]
                    }
                }
                else if (title == "Pipe") {
                    obj["name"] = "pipe"
                    pipes.push(obj)
                }
                else if (title == "Stone") {
                    stones.push(obj)
                    obj["name"] = "stone"
                }
                else if (title == "Floor") {
                    floors.push(obj)
                    this.floor = obj;
                    obj["name"] = "floor"
                }
                else if (title == "Brick" && solids[i].contents != null) {
                    obj["contains"] = solids[i].contents
                    if (solids[i].contents == "Star")
                        foodblocks.push(obj)
                    else
                        coinblocks.push(obj)
                    obj["name"] = "block_" + obj["contains"]
                }
            }

            var infos = {}
            infos["foods"] = foods
            infos["foodblocks"] = foodblocks
            infos["enermys"] = enemys
            infos["coinblocks"] = coinblocks
            infos["coins"] = coins
            infos["pipes"] = pipes
            infos["stones"] = stones

            var ravines = []
            nearest_dist = 100000;
            var nearest_ravine = null;
            for (var i = 1; i < floors.length; i++)
            {
                var ravine = {}
                ravine.left = floors[i-1].right;
                ravine.width = floors[i].left - floors[i-1].right;
                ravine.right = ravine.left + ravine.width;
                ravine.top = floors[i-1].top;

                ravine.bottom = floors[i-1].bottom;

                ravine.name = "ravine"

                ravine.left_to_player = ravine.left - FSM.player.left
                ravine.right_to_player = ravine.right - FSM.player.right
                ravine.top_to_player = ravine.top - FSM.player.bottom;
                ravine.is_nearest = false;

                if (ravine.left_to_player < 0 && ravine.right_to_player > 0)
                {
                    nearest_ravine = ravine;
                    break;
                }

                // do not consider the left ravine.
                if (ravine.left > 0 && ravine.left <= nearest_dist)
                {
                    nearest_dist = ravine.left;
                    nearest_ravine = ravine;
                }

                ravines.push(ravine);
            }
            infos["nearest_ravine"] = nearest_ravine;
            infos["nearest_character"] = nearest_character;

            infos["floors"] = floors;
            infos["ravines"] = ravines;
            infos["bricks"] = bricks;

            return infos
        }

        GamesRunnr.prototype.set_floor_into_state = function (floors, state) {
            var player = FSM.player;
            for (var i = 0; i < floors.length; i++) {
                var floor = floors[i];
                if (floor.left < player.left && player.right < floor.right) {
                    var r = this.mario_top + Math.round((floor.top - player.top) / block_length);
                    for (var c = 0; c < this.width && r >= 0 && r < height; c++) {
                        var pos = r * this.width + c;
                        state[pos] = objidx_mapper['floor'] / num_of_objs;
                    }
                }
            }

            return state;
        }

        GamesRunnr.prototype.set_objs_into_state = function (objs, state, floor) {
            var player = FSM.player;

            for (var i = 0; i < objs.length; i++) {
                var obj = objs[i];
                for (var left = obj.left; left < obj.right; left += block_length) {
                    for (var top = obj.top; top < obj.bottom; top += block_length) {
                        var r = height - (floor.top - top) / block_length;
                        var c = this.mario_left + Math.floor((left - player.left) / block_length);
                        var pos = r * width + c;
                        if (0 <= r && r < height && 0 <= c && c < width) {
                            state[pos] = objidx_mapper[obj.name] / num_of_objs;
                        }
                    }
                }
            }

            return state;
        }

        GamesRunnr.prototype.get_state_vector = function (infos) {
            var floor = infos["floors"][0];
            this.floor = floor;
            this.mario_bottom = height - (floor.top - FSM.player.bottom) / block_length;
            this.mario_top = this.mario_bottom - 32 / block_length;
            this.mario_right = 32 / block_length - 1;
            this.mario_left = 0;

            //var buffer = new ArrayBuffer(height * width);
            //var state = new Float32Array(buffer);
            var state = new Float32Array(this.height * this.width);
            for (var r = 0; r < height; r++) {
                for (var c = 0; c < this.width; c++) {
                    var pos = r * this.width + c;
                    if ((c >= this.mario_left && c <= this.mario_right) &&
                        (r >= this.mario_top && r <= this.mario_bottom)) {
                        state[pos] = objidx_mapper['M'];
                    }
                    else {
                        state[pos] = objidx_mapper[' '];
                    }
                }
            }

            //state = this.set_floor_into_state(infos["floors"], state);
            state = this.set_objs_into_state(infos["enermys"], state, floor);
            state = this.set_objs_into_state(infos["coinblocks"], state, floor);
            state = this.set_objs_into_state(infos["foodblocks"], state, floor);
            state = this.set_objs_into_state(infos["bricks"], state, floor);
            state = this.set_objs_into_state(infos["foods"], state, floor);
            state = this.set_objs_into_state(infos["stones"], state, floor);
            state = this.set_objs_into_state(infos["pipes"], state, floor);
            return state;
        }

        // Interface to get the current state
        GamesRunnr.prototype.mario_state = function() {
            // return this.get_state_vector(this.collect_group_info());

            var infos = this.collect_group_info();
            var nearest_enermy = infos["nearest_character"];
            var nearest_ravine = infos["nearest_ravine"];

            var sorted_enermys = infos["enermys"].sort(function(e1, e2){
                return Math.abs(e1.left - FSM.player.left) - Math.abs(e2.left - FSM.player.left)
            })

            var horizontal_scale = 1.0 / 1286;
            var vertial_scale = 1.0 / 464;

            var state = new Float32Array(3);
            state[0] = state[1] = 0.0;

            // 3 enermy
            state = new Float32Array(this.width);
            state.fill(0);
            for (var i = 0; i<sorted_enermys.length; i += 2)
            {
                state[i] = (sorted_enermys[i].left - FSM.player.left) * horizontal_scale;
                state[i+1] = (sorted_enermys[i].top - FSM.player.top) * vertial_scale;
            }

            if (false && nearest_ravine != null)
            {
                state = new Float32Array(3);
                state[0] = nearest_ravine.left_to_player * horizontal_scale;
                state[1] = nearest_ravine.right_to_player * horizontal_scale;
                state[2] = nearest_ravine.top_to_player * vertial_scale;

                // coin:
                // var nearest_character = infos["nearest_character"];
                // if (nearest_character != null)
                //     state[3] =infos["nearest_character"]
            }

            return state
        }

        GamesRunnr.prototype.init_state = function () {
            if(false)
            {
                block_length = 1;    //每个格子代表的屏幕像素数目。
                this.width = 32 / block_length * 3;
                this.height = width;

                this.mario_bottom = height - 1;
                this.mario_top = this.mario_bottom - 32 / block_length;
                this.mario_right = 32 / block_length - 1;
                this.mario_left = 0;
            }

            this.width = 6;
            this.height = 1;
        }

        GamesRunnr.prototype.init_connection = function() {
            if (this.connection == null)
            {
                this.connection = new WrapperWS(this);
                this.opened = false;

                function do_nothing() {
                    if (this.opened == false)
                        setTimeout( function(){do_nothing();}, 1000);
                }

                do_nothing();
            }
        }

        function WrapperWS(GamesRunnr) {
            if ("WebSocket" in window) {
                var ws = new WebSocket("ws://localhost:8080/soc");
                var self = this;

                ws.onopen = function () {
                    console.log("Opening a connection...");
                    window.identified = false;
                    var infos = {'width':GamesRunnr.width, 'height':GamesRunnr.height,
                        'num_of_actions': GamesRunnr.A.length}
                    this.send(JSON.stringify(infos));
                    GamesRunnr.opened = true;
                };
                ws.onclose = function (evt) {
                    console.log("I'm sorry. Bye!");
                };
                ws.onmessage = function (evt) {
                    // handle messages here
                    var action = parseInt(evt.data);
                    if (!isNaN(action))
                    {
                        GamesRunnr.current_action = GamesRunnr.A[parseInt(evt.data)];
                    }
                    return evt;
                };
                ws.onerror = function (evt) {
                    console.log("ERR: " + evt.data);
                };

                this.send = function (message, callback) {
                    if (GamesRunnr.opened == false)
                        return;

                    this.waitForConnection(function () {
                      ws.send(message);
                      if (typeof callback !== 'undefined') {
                        callback();
                      }
                    }, 1000);
                };

                this.waitForConnection = function (callback, interval) {
                    if (ws.readyState === 1) {
                        callback();
                    } else {
                        var that = this;
                        // optional: implement backoff for interval here
                        setTimeout(function () {
                            that.waitForConnection(callback, interval);
                        }, interval);
                    }
                };
            };
        }


        GamesRunnr.prototype.init_actions = function () {

            // RIGHT_UP : 0,
            // RIGHT_DOWN : 1,
            // LEFT_UP : 2,
            // LEFT_DOWN : 3,
            // UP_UP : 4,
            // UP_DOWN : 5,
            // STOP : 6,
            // NONE : 7,

            this.A = new Array();

            // 0
            var small_step = new MarioAction(this, [1, 7, 7, 7, 0], "move");
            this.A.push(small_step);

            // 1
            var small_jump_up = new MarioAction(this, [5, 7, 7, 7, 7, 4], "jump");
            this.A.push(small_jump_up);

            // 2
            var temp = new Int32Array(40);  temp.fill(7);   temp[0] = 1;
            var middle_run = new MarioAction(this, temp, "move");
            this.A.push(middle_run);

            // 3: small_jump_right
            var small_jump_right = new MarioAction(this, [5,1,7,7,7,4,7,7,7,7,7,7,7,7,7,7,7,7,7,0], "jump");
            this.A.push(small_jump_right);

            // 4: middle jump right
            temp = new Int32Array(40);
            temp.fill(7);
            temp[0]=1; temp[1]=5;
            temp[temp.length - 1]=0; temp[parseInt(temp.length / 2)]=4;
            var jump_right = new MarioAction(this, temp, "jump");
            //this.A.push(jump_right);

            // 5: stop for 2 sec;
            temp = new Int32Array(40); temp.fill(7); temp[0] = 6;
            var stop = new MarioAction(this, temp, "stop");
            this.A.push(stop);

            // 4: run without stop
            // temp = new Int32Array(100); temp.fill(7); temp[0] = 1;
            // var run = new MarioAction(this, temp, "move");
            // //this.A.push(run);
            //
            // // 5
            // var run_and_jump = new MarioAction(this, [1,7,7,7,7,7,7,7,7,7,7,7,
            //     7,7,7,7,7,7,7,7,7,7,5,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
            //     7,4,7,7,7,7,0]);
            //this.A.push(run_and_jump);
            //temp[temp.length - 1] = 0;


            if (this.connection == null)
                this.connection = new WrapperWS(this);
        }

        var exe_A = [4, 2, 4, 3, 2, 4, 3, 2];
        var exe_count = 0;

        GamesRunnr.prototype.upkeep2 = function() {
            // debug action
            function randint(min, max) {
                return Math.floor(Math.random() * (max - min + 1)) + min
            }

            if (this.current_action == null || this.isStepEnd())
            {
                if (exe_count < exe_A.length)
                {
                    this.current_action = this.A[exe_A[exe_count]];
                    exe_count++;
                    this.current_action.reset();
                }
                else {
                    //exe_count = 0;
                }
            }

            this.current_action.run();

            this.upkeepRealAction();

            if (FSM.action_record == MarioEvent.DIED)
                FSM.gameReset();
            FSM.action_record = MarioEvent.NONE;
        }


        GamesRunnr.prototype.upkeep = function() {
            function randint(min, max) {
                return Math.floor(Math.random() * (max - min + 1)) + min
            }

            if (this.current_action == null)
            {
                var state = this.mario_state();
                this.connection.send(state.toString());
            }

            function receive_and_execute(action) {
                if (action == null)
                    setTimeout( function(){receive_and_execute();}, 1000);
                else
                    action.run();
            }

            receive_and_execute(this.current_action);
            this.upkeepRealAction();

            if (this.isStepEnd()) {
                var state_ = this.mario_state();
                var reward = this.Reward();
                var infos = {'xt_1':state_, 'reward':reward,
                      'is_end': FSM.action_record == MarioEvent.DIED ? 1 : 0}
                this.connection.send(JSON.stringify(infos));

                this.current_action.reset();
                this.current_action = null;

                if (FSM.action_record == MarioEvent.DIED)
                {
                    FSM.action_record = MarioEvent.NONE;
                    FSM.gameReset();
                }
                FSM.action_record = MarioEvent.NONE;
            }
        }

        GamesRunnr.prototype.isLanding = function() {
            if (this.floor == null)
                return false;
            return Math.abs(FSM.player.bottom - this.floor.top) <= 1;
        }

        GamesRunnr.prototype.isStepEnd = function() {
            if (FSM.action_record == MarioEvent.DIED)
                return true;

            if (this.isDropIntoRavine())
                return false;

            // if (FSM.action_record == MarioEvent.KILL || FSM.action_record == MarioEvent.RICH)
            //     return true;

            if (this.current_action != null && this.current_action.type == 'jump')
            {
                if (!this.isLanding())
                    return false;
            }

            if (this.current_action != null && this.current_action.is_done())
                return true;
        }

        GamesRunnr.prototype.isDropIntoRavine = function() {
            var infos = this.collect_group_info();
            for(var i = 0; i<infos["ravines"].length; i++)
            {
                var ravine = infos["ravines"][i];
                if (FSM.player.right > ravine.left && FSM.player.right <= ravine.right &&
                        FSM.player.bottom > this.floor.top)
                    return true;
            }
            return false;
        }

        GamesRunnr.prototype.upkeepRealAction = function() {
            if (this.paused) {
                return;
            }

            this.upkeepCanceller(this.upkeepNext);
            if (this.adjustFramerate) {
                this.upkeepNext = this.upkeepScheduler(this.upkeepBound, this.intervalReal - (this.upkeepTimed() | 0));
            }
            else {
                this.upkeepNext = this.upkeepScheduler(this.upkeepBound, this.intervalReal);
                this.runAllGames();
            }
            if (this.FPSAnalyzer) {
                this.FPSAnalyzer.measure();
            }
        }

        GamesRunnr.prototype.Reward = function() {
            if (FSM.action_record != MarioEvent.NONE)
            {
                //    NONE: 0,  KILL: 1,  POWERUP: 2, POWERDOWN: 3,   DIED: 4,  PASS: 5,
                switch (FSM.action_record)
                {
                      case MarioEvent.KILL:     console.log("kill!");       return 1;
                      case MarioEvent.POWERUP:  console.log("power up!");   return 15;
                      case MarioEvent.DIED:     console.log("died...");     return -1;
                      case MarioEvent.PASS:     console.log("pass!");       return 140;
                      case MarioEvent.RICH:     console.log("get coin!");   return 0;
                      case MarioEvent.POWERDOWN: console.log("power down..."); return -2;
                      case MarioEvent.XUMIN: console.log("+1s"); return 50;
                }
            }

            return 0;
        }

        /**
         * A utility for this.upkeep that calls the same games.forEach(run), timing
         * the total execution time.
         *
         * @returns The total time spent, in milliseconds.
         */
        GamesRunnr.prototype.upkeepTimed = function () {
            if (!this.FPSAnalyzer) {
                throw new Error("An internal FPSAnalyzr is required for upkeepTimed.");
            }
            var now = this.FPSAnalyzer.getTimestamp();
            this.runAllGames();
            return this.FPSAnalyzer.getTimestamp() - now;
        };
        /**
         * Continues execution of this.upkeep by calling it. If an onPlay has been
         * defined, it's called before.
         */
        GamesRunnr.prototype.play = function () {
            if (!this.paused) {
                return;
            }
            this.paused = false;
            if (this.onPlay) {
                this.onPlay.apply(this, this.callbackArguments);
            }
            this.upkeep();
        };
        /**
         * Stops execution of this.upkeep, and cancels the next call. If an onPause
         * has been defined, it's called after.
         */
        GamesRunnr.prototype.pause = function () {
            if (this.paused) {
                return;
            }
            this.paused = true;
            if (this.onPause) {
                this.onPause.apply(this, this.callbackArguments);
            }
            this.upkeepCanceller(this.upkeepNext);
        };
        /**
         * Calls upkeep a <num or 1> number of times, immediately.
         *
         * @param [num]   How many times to upkeep (by default, 1).
         */
        GamesRunnr.prototype.step = function (times) {
            if (times === void 0) { times = 1; }
            this.play();
            this.pause();
            if (times > 0) {
                this.step(times - 1);
            }
        };
        /**
         * Toggles whether this is paused, and calls the appropriate Function.
         */
        GamesRunnr.prototype.togglePause = function () {
            this.paused ? this.play() : this.pause();
        };
        /* Games manipulations
        */
        /**
         * Sets the interval between between upkeeps.
         *
         * @param interval   The new time interval in milliseconds.
         */
        GamesRunnr.prototype.setInterval = function (interval) {
            var intervalReal = Number(interval);
            if (isNaN(intervalReal)) {
                throw new Error("Invalid interval given to setInterval: " + interval);
            }
            this.interval = intervalReal;
            this.setIntervalReal();
        };
        /**
         * Sets the speed multiplier for the interval.
         *
         * @param speed   The new speed multiplier. 2 will cause interval to be
         *                twice as fast, and 0.5 will be half as fast.
         */
        GamesRunnr.prototype.setSpeed = function (speed) {
            var speedReal = Number(speed);
            if (isNaN(speedReal)) {
                throw new Error("Invalid speed given to setSpeed: " + speed);
            }
            this.speed = speedReal;
            this.setIntervalReal();
        };
        /* Utilities
        */
        /**
         * Sets the intervalReal variable, which is interval * (inverse of speed).
         */
        GamesRunnr.prototype.setIntervalReal = function () {
            this.intervalReal = (1 / this.speed) * this.interval;
        };
        /**
         * Runs all games in this.games.
         */
        GamesRunnr.prototype.runAllGames = function () {
            for (var i = 0; i < this.games.length; i += 1) {
                this.games[i]();
            }
        };
        return GamesRunnr;
    })();
    GamesRunnr_1.GamesRunnr = GamesRunnr;
})(GamesRunnr || (GamesRunnr = {}));
