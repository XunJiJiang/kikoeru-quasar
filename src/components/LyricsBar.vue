<template>
  <q-card
    v-if="!hideLyrics"
    id="draggable"
    @mousedown="onCursorDown"
    @mouseup="onCursorUp"
    @touchstart="onCursorDown"
    @touchend="onCursorUp"
  >
    <div id="lyricsBar" class="text-center text-h6 text-bold ellipsis-2-lines text-purple q-mb-md absolute-bottom">
      <span id="lyric">
        {{ currentLyric }}
      </span>
    </div>
  </q-card>
</template>

<script>
import { mapState, mapMutations } from 'vuex';

const onCursorMove = that => ev => {
  if (!that.beTouched) {
    return;
  }

  // ev.preventDefault()
  const touch = that.getTouch(ev);

  // 计算 element 新位置坐标
  const eleX = touch.clientX - that.startX;
  const eleY = touch.clientY - that.startY;

  that.draggable.style.left = eleX + 'px';
  that.draggable.style.top = eleY + 'px';
};

export default {
  name: 'LyricsBar',

  computed: {
    ...mapState('AudioPlayer', ['playing', 'currentLyric', 'hasPictureInPicture']),

    draggable() {
      return document.getElementById('draggable');
    },
  },

  data() {
    return {
      beTouched: false,

      // 鼠标按下时的位置
      startX: 0,
      startY: 0,

      // 是否隐藏内部歌词
      hideLyrics: false,

      // 画中画窗口 document
      pipWindow: null,
    };
  },

  watch: {
    /** 监视 hasPictureInPicture */
    async hasPictureInPicture(newVal) {
      if (!window.documentPictureInPicture) {
        return;
      }
      if (newVal) {
        this.hideLyrics = true; // 隐藏歌词
        const pipWindow = await window.documentPictureInPicture.requestWindow({
          width: 400,
          height: 100,
        });

        this.pipWindow = pipWindow;

        pipWindow.addEventListener('pagehide', () => {
          this.switchPictureInPicture();
        });

        window.documentPictureInPicture.addEventListener('enter', () => {
          this.pipReady = true;
        });
      } else {
        this.hideLyrics = false; // 显示歌词
        if (window.documentPictureInPicture.window) {
          window.documentPictureInPicture.window.close();
        }
      }
    },

    playing(newVal) {
      if (this.pipWindow && this.pipWindow.document) {
        const pipDoc = this.pipWindow.document;
        const btn = pipDoc.querySelector('#pip-play-toggle');
        if (btn) {
          btn.innerHTML = newVal
            ? `<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="3" width="5" height="14" rx="1" fill="#fff"/>
                <rect x="12" y="3" width="5" height="14" rx="1" fill="#fff"/>
              </svg>`
            : `<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <polygon points="4,3 17,10 4,17" fill="#fff"/>
              </svg>`;
        }
      }
    },
    currentLyric(newVal) {
      if (this.pipWindow && this.pipWindow.document) {
        const pipDoc = this.pipWindow.document;
        const lyric = pipDoc.querySelector('#lyric-text');
        if (lyric) {
          lyric.textContent = newVal;
        }
      }
    },
    pipWindow(newVal) {
      if (newVal && newVal.document) {
        const pipDoc = newVal.document;
        pipDoc.body.style.cssText = 'background-color:#000;margin:0;padding:0;';
        pipDoc.body.innerHTML = `
            <div id="lyricsBar" style="text-align:center;font-size:1em;color:#fffd;background-color:#000;">
              <span id="lyric-text">${this.currentLyric}</span>
              <button id="pip-play-toggle" style="position:absolute;bottom:3px;left:3px;padding:4px 12px;font-size:1em;background:none;border:none;outline:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;border-radius:6px;transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='none'">
              ${
                this.playing
                  ? `<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="3" y="3" width="5" height="14" rx="1" fill="#fff"/>
                  <rect x="12" y="3" width="5" height="14" rx="1" fill="#fff"/>
                  </svg>`
                  : `<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <polygon points="4,3 17,10 4,17" fill="#fff"/>
                  </svg>`
              }
              </button>
            </div>
          `;
        this.attachPipPlayToggleHandler();
      }
    },
  },

  methods: {
    /**
     * 在画中画窗口中添加播放/暂停按钮的事件监听
     */
    attachPipPlayToggleHandler() {
      if (!this.pipWindow || !this.pipWindow.document) return;
      const pipDoc = this.pipWindow.document;
      const btn = pipDoc.getElementById('pip-play-toggle');
      if (btn) {
        btn.onclick = () => {
          this.togglePlaying();
        };
      }
    },

    ...mapMutations('AudioPlayer', {
      togglePlaying: 'TOGGLE_PLAYING',
      switchPictureInPicture: 'TOGGLE_PICTURE_IN_PICTURE',
    }),

    /**
     * @param {TouchEvent|MouseEvent} ev
     */
    getTouch(ev) {
      return ev.touches ? ev.touches[0] : ev;
    },

    onCursorDown(ev) {
      ev.preventDefault();
      this.beTouched = true;

      // 移动端使用 ev.touches[0]
      const touch = this.getTouch(ev);
      this.startX = touch.clientX - this.draggable.offsetLeft;
      this.startY = touch.clientY - this.draggable.offsetTop;
    },

    onCursorUp(ev) {
      ev.preventDefault();
      this.beTouched = false;
    },
  },

  mounted() {
    addEventListener('mousemove', onCursorMove(this), false);
    addEventListener('touchmove', onCursorMove(this), false);
  },
};
</script>

<style lang="scss">
.moveable-line {
  background-color: transparent !important;
}
#lyricsBar {
  background-color: rgba($grey-4, $alpha: 0.6);
  min-width: 1vw;
  position: absolute;
}
</style>
