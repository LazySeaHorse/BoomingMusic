/*
 * Miller Shuffle Algorithm – Kotlin port
 *
 * Original C source: https://github.com/RondeSC/Miller_Shuffle_Algo
 * Original author  : Ronald R. Miller
 * Original license : Apache-2.0 / Attribution-NonCommercial-ShareAlike
 *
 * This is a faithful translation of the "MillerShuffle_Large" variant, which
 * supports up to 4 294 967 296 items (well beyond any realistic playlist size)
 * with no array allocation and O(1) time per index lookup.
 *
 * Key property: for every (mixId, listSize) pair, calling millerShuffleIndex()
 * with inx = 0, 1, 2, … listSize-1 yields every value in [0, listSize) exactly
 * once, in a pseudo-random order.  The same shuffleId always produces the same
 * permutation, making it fully deterministic and persistable with just two longs.
 */

package com.mardous.booming.playback.shuffle

/**
 * Computes one shuffled index from the Miller Shuffle (Large) algorithm.
 *
 * @param inx       Sequential reference index, normally 0..<[listSize].
 *                  Values ≥ listSize wrap into a "next shuffle" transparently.
 * @param mixId     A 32-bit unsigned value (passed as [Long] to avoid sign issues)
 *                  that uniquely identifies and fully determines the shuffle order.
 * @param listSize  Number of items to shuffle (1 … 4 294 967 295).
 * @return          A shuffled index in [0, listSize).
 */
internal fun millerShuffleIndex(inx: Long, mixId: Long, listSize: Long): Long {
    require(listSize > 0) { "listSize must be > 0" }
    if (listSize == 1L) return 0L
    if (listSize <= 2L) return ((mixId / (inx / 2 + 1)) + inx) % listSize

    // Primes used as multipliers – large enough to exceed typical list sizes.
    // Stored as Long so all multiplications stay in 64-bit arithmetic.
    var p1 = 98323L
    var p2 = 93251L
    val p3 = 66107L

    // Blend inx overflow back into mixId for automatic "re-shuffle" beyond listSize
    val effectiveMixId = mixId xor (19L * (inx / listSize))

    var si = (inx + (effectiveMixId % listSize)) % listSize

    // Compute fixed randomizing constants for this (mixId, listSize) pair.
    // Avoid primes that divide evenly into listSize or the derived modulo ranges.
    if (listSize % p1 == 0L) p1 = p3
    if (listSize % p2 == 0L) p2 = p3

    val r1 = effectiveMixId % p2
    val r2 = effectiveMixId % p1
    val r3 = effectiveMixId % 6983L
    val r4 = effectiveMixId % 4793L
    var rx  = (effectiveMixId / listSize) % listSize + 1L
    val rx2 = (effectiveMixId / 43L)      % listSize + 1L

    // Guard against rx landing on a modulo boundary that would break uniqueness
    if ((((listSize + 1L) / 2L) % p2) == 0L) p2 = p3
    if ((((listSize + 2L) / 3L) % p1) == 0L) p1 = p3
    if ((rx % p2) == 0L) rx--
    if ((listSize - rx) % p1 == 0L) rx--

    // Multi-faceted spin-mixing operations (conditional on value parity / position)
    if (si % 3L == 0L)
        si = ((si / 3L) * p1 + r1) % ((listSize + 2L) / 3L) * 3L

    if (si % 2L == 0L)
        si = ((si / 2L) * p2 + r2) % ((listSize + 1L) / 2L) * 2L

    si = if (si < rx) {
        ((rx - si - 1L) * p2 + (r3 + r1)) % rx
    } else {
        ((si - rx) * p1 + r3) % (listSize - rx) + rx
    }

    if ((si xor rx2) < listSize) si = si xor rx2

    // Final churning pass – important for large playlists
    si = ((listSize - si) * p1 + r4) % listSize

    return si
}
