import caffe

#define network first
from caffe import layers as L, params as P
import numpy as np
import random

def mario_prototxt(batch_size, num_of_actions, height, width, frames):
    n = caffe.NetSpec()
    n.frames, n.dummy1 = L.MemoryData(batch_size=batch_size,
                        height=height,
                        width=width,
                        channels=frames,
                        ntop=2)
    n.target, n.dummy2 = L.MemoryData(batch_size=batch_size,
                        channels=num_of_actions,
                        height=1,
                        width=1,
                        ntop=2)
    n.filter, n.dummy3 = L.MemoryData(batch_size=batch_size,
                        channels=num_of_actions,
                        height=1,
                        width=1,
                        ntop=2)

    # reshape
    n.target = L.Reshape(n.target, reshape_param={'shape':{'dim':[0, -1]}})
    n.filter = L.Reshape(n.filter, reshape_param={'shape':{'dim':[0, -1]}})

    n.silence_layer = L.Silence(n.dummy1, n.dummy2, n.dummy3, ntop=0)

    n.conv1 = L.Convolution(n.frames, kernel_size=8, num_output=16, weight_filler=dict(type='gaussian'))
    n.conv1_relu_layer = L.ReLU(n.conv1, in_place=True)
    n.conv2 = L.Convolution(n.conv1, kernel_size=4, num_output=32, stride=2, weight_filler=dict(type='gaussian'))
    n.conv2_relu_layer = L.ReLU(n.conv2, in_place=True)

    n.ip1 = L.InnerProduct(n.conv2_relu_layer, num_output=256, weight_filler=dict(type='gaussian'))
    n.ip1_relu_layer = L.ReLU(n.ip1, in_place=True)

    n.q_values = L.InnerProduct(n.ip1, num_output=num_of_actions, weight_filler=dict(type='xavier'))

    n.filtered_q_values = L.Eltwise(n.filter, n.q_values, operation=P.Eltwise.PROD)
    n.loss = L.EuclideanLoss(n.filtered_q_values, n.target)

    return n.to_proto()

def optimsed_action(Net, state, num_of_actions, height, width, e=0.1):
    if (random.random() < e):
        return random.randint(0, num_of_actions - 1)
    else:
        yj = np.zeros((1, num_of_actions, 1, 1), dtype='float32')
        aj = np.zeros((1, num_of_actions, 1, 1), dtype='float32')

        dummy1 = dummy2 = dummy3 = np.zeros((1, 1, 1, 1), dtype='float32')

        Net.set_input_arrays_from_name('frames', state.reshape(1, 1, height, width), dummy1)
        Net.set_input_arrays_from_name('MemoryData1', yj, dummy2)
        Net.set_input_arrays_from_name('MemoryData2', aj, dummy3)

        Net.forward()
        max_action = Net.blobs["q_values"].data.argmax()
        return max_action


def construct_net(batch_size, num_of_actions, height, width, frames):
    print 'begin writing and no more data receiving'
    with open('mario.prototxt', 'w') as f:
        f.write(str(simple_prototxt(batch_size, num_of_actions, height, width, frames)))

    caffe.set_device(0)
    caffe.set_mode_gpu()

    solver = caffe.SGDSolver('mario_solver.prototxt')
    return solver


def training(solver, stable_net, transition, num_of_actions, height, width):
    (sj, a, rj, sj_1, is_terminate) = transition

    sj_1 = sj_1.reshape(1, 1, height, width)
    sj = sj.reshape(1, 1, height, width)

    yj = np.zeros((1, num_of_actions, 1, 1), dtype='float32')
    yj[:, a, :, :] = rj

    aj = np.zeros((1, num_of_actions, 1, 1), dtype='float32')
    aj[:, a, :, :] = 1.

    dummy1 = dummy2 = dummy3 = np.zeros((1, 1, 1, 1), dtype='float32')

    if not is_terminate:
        stable_net.set_input_arrays_from_name('frames', sj_1, dummy1)
        stable_net.forward(start='frames', end='q_values')
        q_sj_1_max = stable_net.blobs["q_values"].data.max()
        yj[:, a, :, :] = rj + 0.01 * q_sj_1_max

    solver.net.set_input_arrays_from_name('frames', sj, dummy1)
    solver.net.set_input_arrays_from_name('MemoryData1', yj, dummy2)
    solver.net.set_input_arrays_from_name('MemoryData2', aj, dummy3)

    solver.step(1);

    loss = solver.net.blobs['loss'].data
    qvalues = solver.net.blobs['q_values']

    #print rj
    # if rj != 0:
    #     print 'rj: %f' % rj
    #     print 'yj: %f' % yj[:, a, :, :]
    #     print 'Q(sj,aj): ', qvalues.data[0, a]
    #     print '\n\n'

    return loss


def simple_prototxt(batch_size, num_of_actions, height, width, frames):
    n = caffe.NetSpec()
    n.frames, n.dummy1 = L.MemoryData(batch_size=batch_size,
                        height=height,
                        width=width,
                        channels=frames,
                        ntop=2)
    n.target, n.dummy2 = L.MemoryData(batch_size=batch_size,
                        channels=num_of_actions,
                        height=1,
                        width=1,
                        ntop=2)
    n.filter, n.dummy3 = L.MemoryData(batch_size=batch_size,
                        channels=num_of_actions,
                        height=1,
                        width=1,
                        ntop=2)

    # reshape
    n.target = L.Reshape(n.target, reshape_param={'shape':{'dim':[0, -1]}})
    n.filter = L.Reshape(n.filter, reshape_param={'shape':{'dim':[0, -1]}})

    n.silence_layer = L.Silence(n.dummy1, n.dummy2, n.dummy3, ntop=0)

    n.ip1 = L.InnerProduct(n.frames, num_output=width*2, weight_filler=dict(type='gaussian'))
    #n.ip2 = L.InnerProduct(n.ip1, num_output=width*2, weight_filler=dict(type='gaussian'))
    n.q_values = L.InnerProduct(n.ip1, num_output=num_of_actions, weight_filler=dict(type='xavier'))

    n.filtered_q_values = L.Eltwise(n.filter, n.q_values, operation=P.Eltwise.PROD)

    n.loss = L.EuclideanLoss(n.filtered_q_values, n.target)
    return n.to_proto()
