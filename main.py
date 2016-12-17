import tornado.web
import tornado.ioloop
import tornado.websocket
import os
import config
import json
import struct
import array
import math
import numpy as np
import random
import caffe
from caffedqn import *

os.system("./killport.sh")

current_action = 0

def output_state(s):
    if s is None:   return
    print '*' * 80
    str_state = ''
    num_of_cols = int(math.sqrt(len(s)))
    for i in range(len(s)):
        str_state += str(int(s[i] * 10) % 9) + " "
        if (i + 1) % num_of_cols == 0:
            str_state += '\n'

    print str_state
    print '*' * 80
    print '\n\n\n'

class DeployMemory:
    def __init__(self, N):
        self.N = N
        self.D = []

    def store(self, transition):
        if len(self.D) >= self.N:
            self.D.pop(self.pick())
        self.D.append(transition)

    def pick(self):
        return random.randint(0, len(self.D) - 1)

    def sample(self):
        if len(self.D) == 0:
            return None
        return self.D[self.pick()]

    def __len__(self):
        return len(self.D)


class MarioHandler(tornado.websocket.WebSocketHandler):
    def open(self):
        self.write_message('Welcome to WebSocket')
        self.dqn = None
        self.s = None
        self.s_ = None
        self.a = None
        self.r = 0
        self.num_of_actions = 0
        self.width = self.height = 0
        self.frames = 1
        self.batch_size = 1
        self.N = 10000
        self.count = 1
        self.C = 30
        self.episode_max = 10000
        self.total_loss = 0.0  # every C updates
        #SocketHandler.clients.add(self)

    def on_close(self):
        print 'close'
        #SocketHandler.clients.remove(self)

    def is_init(self, message):
        if self.width == 0:
            d = eval(message)
            self.width = d['width']
            self.height = d['height']
            self.num_of_actions = d['num_of_actions']

            self.solver = construct_net(self.batch_size, self.num_of_actions, self.height, self.width, self.frames)
            self.stable_net = self.solver.net

            self.deployMemory = DeployMemory(self.N)
            return True
        else:
            return False

    #mario action: 0:Move_Right    1:Jump_Right     2:None
    def on_message(self, message):
        global current_action
        if not self.is_init(message):
            info = eval(message)
            if type(info) is type(tuple()):
                self.s = np.array(info, dtype='float32')
                #self.a = random.randint(0, self.num_of_actions - 1)
                self.a = optimsed_action(self.stable_net, self.s, self.num_of_actions, self.height, self.width)
                self.write_message(str(self.a))

                #print 'receive s %s' % str(self.s.shape)

            elif type(info) is type(dict()):
                rj  = info['reward']
                self.s_ = np.array(info['xt_1'].values(), dtype='float32')
                # Store transition w t ,a t ,r t ,w tz1 in D
                transition = (self.s, self.a, rj, self.s_, info['is_end'])
                self.deployMemory.store(transition)

                #loss = training(self.solver, stable_net, transition, self.num_of_actions, self.height, self.width)

                # sample random minibatch of transitions from D:
                loss = training(self.solver, self.stable_net, self.deployMemory.sample(), self.num_of_actions, self.height, self.width)
                self.total_loss += loss

                # Every C steps reset Q^ to Q
                if self.count % self.C == 0:
                    #print 'loss: %f' % self.total_loss
                    self.total_loss = 0.
                    self.stable_net = self.solver.net
                    self.count = 0
                self.count += 1


class Index(tornado.web.RequestHandler):
    def get(self):
        self.render('index.html')

class Application(tornado.web.Application):
    def __init__(self):
        handlers = [
            ('/', Index),
            ('/soc', MarioHandler),
        ]
        settings = {
            'template_path': "./templates/FullScreenMario-master/Source/",
            'static_path': "./templates/FullScreenMario-master/Source/static",
        }
        tornado.web.Application.__init__(self, handlers, **settings)


if __name__ == '__main__':
    app = Application()
    app.listen(8080)
    tornado.ioloop.IOLoop.instance().start()
