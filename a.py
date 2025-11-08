Convoluton Code:

def convolutional_encode(bits):
    G1 = [1,1,1]  # 111
    G2 = [1,0,1]  # 101
    K = 3
    reg = [0]*K
    encoded = []


    for bit in bits:
        reg = [bit] + reg[:-1]   # Shift register left, insert new bit
        out1 = (reg[0]&G1[0]) ^ (reg[1]&G1[1]) ^ (reg[2]&G1[2])
        out2 = (reg[0]&G2[0]) ^ (reg[1]&G2[1]) ^ (reg[2]&G2[2])
        encoded.extend([out1, out2])
    return encoded
def convolutional_decode(encoded):
    G1 = [1,1,1]  # 111
    G2 = [1,0,1]  # 101
    K = 3
    reg = [0]*K
    decoded = []


    for i in range(0, len(encoded), 2):
        out_pair = encoded[i:i+2]


        # Try input 0
        tmp0 = [0] + reg[:-1]
        o1_0 = (tmp0[0]&G1[0]) ^ (tmp0[1]&G1[1]) ^ (tmp0[2]&G1[2])
        o2_0 = (tmp0[0]&G2[0]) ^ (tmp0[1]&G2[1]) ^ (tmp0[2]&G2[2])


        # Try input 1
        tmp1 = [1] + reg[:-1]
        o1_1 = (tmp1[0]&G1[0]) ^ (tmp1[1]&G1[1]) ^ (tmp1[2]&G1[2])
        o2_1 = (tmp1[0]&G2[0]) ^ (tmp1[1]&G2[1]) ^ (tmp1[2]&G2[2])


        # Choose matching input
        if [o1_0, o2_0] == out_pair:
            decoded.append(0)
            reg = tmp0
        else:
            decoded.append(1)
            reg = tmp1
    return decoded
input_bits = [1,0,1,1]
encoded = convolutional_encode(input_bits)
print("Original input bits:", input_bits)
print("Encoded bits       :", encoded)
# manually inject error
encoded[3] ^= 1     # flip a bit
print("After error added :",encoded)


decoded = convolutional_decode(encoded)
print("Decoded bits       :", decoded)

Lempel:

def lz78_encode_format(message):
    dictionary = {}
    dict_idx = 1
    current_msg = ''
    num_positions = []      # dictionary indices assigned
    subsequences = []       # phrase inserted at that index
    output = []             # human-readable: '0A', '3B', ...
    encoded = []            # 4-bit blocks: 3-bit index + 1-bit symbol


    i = 0
    while i < len(message):
        current_msg += message[i]
        if current_msg not in dictionary:
            num_positions.append(dict_idx)
            subsequences.append(current_msg)


            if len(current_msg) == 1:
                prefix_idx = 0
                symbol = current_msg
            else:
                prefix_idx = dictionary[current_msg[:-1]]
                symbol = current_msg[-1]


            output.append(f"{prefix_idx}{symbol}")
            block_code = format(prefix_idx, '03b') + ('0' if symbol == 'A' else '1')
            encoded.append(block_code)


            dictionary[current_msg] = dict_idx
            dict_idx += 1
            current_msg = ''
        i += 1


    return num_positions, subsequences, output, encoded


# Example
message = 'AABABBBABAAABBBABBABB'
num_positions, subsequences, output, encoded = lz78_encode_format(message)


print("Input:")
print(f"    message = '{message}'")
print("\nNumerical positions:")
print(num_positions)
print("Subsequences:")
print(subsequences)
print("Output (index+symbol):")
print(output)
print('Encoded (4-bit binary, A=0, B=1; 3-bit index + 1-bit symbol):')
print(encoded)


Hamming:
def hamming_encode(data_bits):
    bits = list(map(int, data_bits))
    k = len(bits)
    r = 0
    while (2**r) < (k + r + 1):
        r += 1
    n = k + r
    code = [0] * n  # 0-based indexing


    # Insert data bits in non-parity positions (not powers of two)
    j = 0
    for i in range(n):
        if not (i+1 & (i)):  # If (i+1) is a power of two (parity position)
            continue
        if j < k:
            code[i] = bits[j]
            j += 1


    # Set parity bits
    for p in range(r):
        idx = 2**p - 1  # parity position in 0-based
        parity = 0
        for i in range(n):
            if (i+1) & (2**p):
                parity ^= code[i]
        code[idx] = parity


    return code


def hamming_decode(received):
    n = len(received)
    r = 0
    while (2**r) < (n + 1):
        r += 1
    syndrome = 0
    for p in range(r):
        parity = 0
        for i in range(n):
            if (i+1) & (2**p):
                parity ^= received[i]
        if parity:
            syndrome += 2**p
    return syndrome-1 if syndrome else None  # 0-based error index, None if no error


def test_hamming(data_bits, error_pos=None):
    print("Input bits:", data_bits)
    codeword = hamming_encode(data_bits)
    print("Encoded:", codeword)
    received = codeword[:]
    if error_pos is not None:
        received[error_pos] ^= 1  # Flip bit at 0-based index
    print("Received:", received)
    err = hamming_decode(received)
    print("Error at index:", err if err is not None else "None")
    if err is not None:
        received[err] ^= 1
    print("Corrected:", received)


# Example usage
test_hamming("10011011", error_pos=4)


Marginal:
import math
matrix = [
 [1/8, 1/16, 1/32, 1/32],
 [1/16, 1/8, 1/32, 1/32],
 [1/16, 1/16, 1/16, 1/16],
 [1/4,  0,    0,    0   ]
]
# Marginal distribution of X
marginal_x = []
for i in range(len(matrix[0])):
    s = 0
    for j in range(len(matrix)):
        s += matrix[j][i]
    marginal_x.append(s)


# Marginal distribution of Y
marginal_y = []
for i in range(len(matrix)):
    marginal_y.append(sum(matrix[i]))


def entropy(marginal_var):
    H = 0
    for x in marginal_var:
        if x == 0:
            continue
        H += -(x * math.log2(x))
    return H


H_x = entropy(marginal_x)
H_y = entropy(marginal_y)


# H(X|Y)
H_x_y = 0
for i in range(len(matrix)):
    tmp = []
    for j in range(len(matrix[0])):
        tmp.append(matrix[i][j] / marginal_y[i])
    H_x_y += entropy(tmp) * marginal_y[i]


# H(Y|X)
H_y_x = 0
for i in range(len(matrix[0])):
    tmp = []
    for j in range(len(matrix)):
        tmp.append(matrix[j][i] / marginal_x[i])
    H_y_x += entropy(tmp) * marginal_x[i]


H_xy = H_y_x + H_x   # = joint entropy
I_xy = H_x + H_y - H_xy


print("H(X) =",H_x)
print("H(Y) =",H_y)
print("H(X|Y) =",H_x_y)
print("H(Y|X) =",H_y_x)
print("H(X,Y) =",H_xy)
print("Mutual Information =",I_xy)

Random Walk:

import math


# graph adjacency: weights[i][j]
weights = [
    [0, 1, 2, 1],  # x1
    [1, 0, 1, 0],  # x2
    [2, 1, 0, 1],  # x3
    [1, 0, 1, 0]   # x4
]


n = len(weights)


# degrees and total degree
degrees = []
total_degree = 0
for i in range(n):
    deg = sum(weights[i])
    degrees.append(deg)
    total_degree += deg


# stationary distribution (for undirected graph)
pi = [deg/total_degree for deg in degrees]


# transition matrix
P = []
for i in range(n):
    row = []
    for j in range(n):
        row.append(weights[i][j]/degrees[i])
    P.append(row)


# entropy rate
H = 0.0
for i in range(n):
    for j in range(n):
        p = P[i][j]
        if p > 0:
            H -= pi[i] * p * math.log2(p)


print("Entropy rate:", round(H, 5), "bits per step")


Huffman:
import heapq
import math


# Example symbol probabilities
probs = {'A': 0.4, 'B': 0.2, 'C': 0.2, 'D': 0.1, 'E':0.1}


# Build Huffman Tree
heap = [[weight, [symbol, ""]] for symbol, weight in probs.items()]
heapq.heapify(heap)


while len(heap) > 1:
    lo = heapq.heappop(heap)
    hi = heapq.heappop(heap)
    for pair in lo[1:]:
        pair[1] = '0' + pair[1]
    for pair in hi[1:]:
        pair[1] = '1' + pair[1]
    heapq.heappush(heap, [lo[0] + hi[0]] + lo[1:] + hi[1:])
codes = sorted(heap[0][1:], key=lambda p: (len(p[1]), p))


print("Symbol\tProb\tCode")
for p in codes:
    print(f"{p[0]}\t{probs[p[0]]}\t{p[1]}")


# Calculate entropy H(X)
H = -sum(p * math.log2(p) for p in probs.values())
print(f"\nEntropy H(X): {H:.4f} bits")


# Average codeword length
L = sum(probs[p[0]] * len(p[1]) for p in codes)
print(f"Average codeword length L: {L:.4f} bits")


# Verify Shannon limit
print(f"\nShannon Bound: {H:.4f} <= {L:.4f} < {H+1:.4f}")