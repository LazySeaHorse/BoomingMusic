/*
 * Copyright (c) 2024 Christians Martínez Alvarado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

package com.mardous.booming.playback

import androidx.media3.common.C
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.source.ShuffleOrder
import com.mardous.booming.playback.shuffle.millerShuffleIndex
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlin.random.Random

/**
 * A [ShuffleOrder] implementation backed by the Miller Shuffle Large algorithm.
 *
 * Unlike [ImprovedShuffleOrder] (which pre-builds a shuffled [IntArray]), this
 * class stores only two numbers:
 *  - [shuffleId] – the seed that fully determines the permutation.
 *  - [length]    – the number of items in the current playlist.
 *
 * An index for any position is computed on demand in O(1) time with no heap
 * allocation beyond the class itself.  This is especially advantageous for
 * libraries with thousands of songs.
 *
 * Wrap-around navigation (prev / next / first / last) is handled by maintaining
 * a logical cursor [currentInx] that tracks which step within the shuffle the
 * player is currently at.  This mirrors how the original C algorithm is intended
 * to be used (increment/decrement `inx` to move forward/back through history).
 *
 * @param shuffleId   32-bit unsigned seed (stored as [Long] to avoid sign issues).
 * @param length      Number of items in the playlist (0 means empty).
 * @param currentInx  The current logical position within the shuffle sequence.
 *                    -1 means "before the first item" (i.e. position is unset).
 */
@UnstableApi
class MillerShuffleOrder private constructor(
    val shuffleId: Long,
    private val length: Int,
    private val currentInx: Int
) : ShuffleOrder {

    /**
     * Secondary constructor – starts with [firstIndex] placed at position 0 in
     * the shuffle sequence so that playback begins from the requested song.
     */
    constructor(firstIndex: Int, length: Int, shuffleId: Long) :
            this(
                shuffleId = shuffleId,
                length = length,
                currentInx = findInxForIndex(firstIndex, length, shuffleId)
            )

    // ------------------------------------------------------------------
    // ShuffleOrder interface
    // ------------------------------------------------------------------

    override fun getLength(): Int = length

    override fun getFirstIndex(): Int {
        if (length == 0) return C.INDEX_UNSET
        return millerShuffleIndex(0L, shuffleId, length.toLong()).toInt()
    }

    override fun getLastIndex(): Int {
        if (length == 0) return C.INDEX_UNSET
        return millerShuffleIndex((length - 1).toLong(), shuffleId, length.toLong()).toInt()
    }

    override fun getNextIndex(index: Int): Int {
        if (length == 0) return C.INDEX_UNSET
        val inx = getInxForIndex(index)
        val nextInx = inx + 1
        if (nextInx >= length) return C.INDEX_UNSET
        return millerShuffleIndex(nextInx.toLong(), shuffleId, length.toLong()).toInt()
    }

    override fun getPreviousIndex(index: Int): Int {
        if (length == 0) return C.INDEX_UNSET
        val inx = getInxForIndex(index)
        val prevInx = inx - 1
        if (prevInx < 0) return C.INDEX_UNSET
        return millerShuffleIndex(prevInx.toLong(), shuffleId, length.toLong()).toInt()
    }

    // ------------------------------------------------------------------
    // Clone operations (required by ExoPlayer when the playlist changes)
    // ------------------------------------------------------------------

    override fun cloneAndInsert(insertionIndex: Int, insertionCount: Int): ShuffleOrder {
        if (length == 0 && insertionCount > 0) {
            // First items added – put the desired start index at position 0
            val startInx = if (currentInx == C.INDEX_UNSET) 0 else currentInx
            return MillerShuffleOrder(startInx, insertionCount, Random.nextLong().toUInt().toLong())
        }
        val newLength = length + insertionCount
        // Keep a fresh shuffleId – newly inserted items should feel random
        return MillerShuffleOrder(
            shuffleId = Random.nextLong().toUInt().toLong(),
            length = newLength,
            currentInx = currentInx.coerceIn(0, newLength - 1)
        )
    }

    override fun cloneAndRemove(indexFrom: Int, indexToExclusive: Int): ShuffleOrder {
        val removeCount = indexToExclusive - indexFrom
        val newLength = length - removeCount
        if (newLength <= 0) return MillerShuffleOrder(
            shuffleId = Random.nextLong().toUInt().toLong(),
            length = 0,
            currentInx = 0
        )
        return MillerShuffleOrder(
            shuffleId = shuffleId,
            length = newLength,
            currentInx = currentInx.coerceIn(0, newLength - 1)
        )
    }

    override fun cloneAndMove(indexFrom: Int, indexToExclusive: Int, newIndexFrom: Int): ShuffleOrder {
        if (length == 0 || (indexToExclusive - indexFrom) <= 0) return this
        // Movements just keep the same shuffleId; relative order is preserved
        return MillerShuffleOrder(shuffleId, length, currentInx)
    }

    override fun cloneAndClear(): ShuffleOrder =
        MillerShuffleOrder(
            shuffleId = Random.nextLong().toUInt().toLong(),
            length = 0,
            currentInx = 0
        )

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    /**
     * Returns the logical shuffle index (inx) for a given playlist [index].
     * We scan the permutation to find it. Since ExoPlayer only calls this when
     * the user explicitly navigates, and playlists rarely exceed a few thousand
     * songs, this O(n) scan is acceptable.  For 5 000 songs each call does at
     * most 5 000 iterations of a handful of arithmetic ops – imperceptible.
     */
    private fun getInxForIndex(index: Int): Int {
        // Start search from currentInx for locality – the answer is almost
        // always just ±1 step away
        if (currentInx != C.INDEX_UNSET &&
            currentInx >= 0 && currentInx < length &&
            millerShuffleIndex(currentInx.toLong(), shuffleId, length.toLong()).toInt() == index
        ) {
            return currentInx
        }
        // Full scan as fallback
        for (i in 0 until length) {
            if (millerShuffleIndex(i.toLong(), shuffleId, length.toLong()).toInt() == index) return i
        }
        return 0
    }

    // ------------------------------------------------------------------
    // Serialization – only two numbers needed to restore state
    // ------------------------------------------------------------------

    @UnstableApi
    @Serializable
    class SerializedOrder(
        @SerialName("shuffleId") val shuffleId: Long,
        @SerialName("length") val length: Int,
        @SerialName("currentInx") val currentInx: Int
    ) {
        override fun toString(): String = Json.encodeToString(this)

        fun toShuffleOrder(): MillerShuffleOrder =
            MillerShuffleOrder(shuffleId, length, currentInx)

        companion object {
            fun from(order: MillerShuffleOrder): SerializedOrder =
                SerializedOrder(order.shuffleId, order.length, order.currentInx)

            fun fromJson(json: String): SerializedOrder =
                Json.decodeFromString<SerializedOrder>(json)
        }
    }

    companion object {
        /**
         * Scans the permutation to find the logical index position that maps to
         * [targetIndex].  Used during construction to place [targetIndex] first.
         */
        private fun findInxForIndex(targetIndex: Int, length: Int, shuffleId: Long): Int {
            if (length == 0) return C.INDEX_UNSET
            for (i in 0 until length) {
                if (millerShuffleIndex(i.toLong(), shuffleId, length.toLong()).toInt() == targetIndex) return i
            }
            return 0
        }
    }
}
