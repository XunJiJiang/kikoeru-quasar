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
import Utils from '../mixins/Utils';

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

  mixins: [Utils],

  computed: {
    ...mapState('AudioPlayer', [
      'playing',
      'currentTime',
      'currentLyric',
      'hasPictureInPicture',
      'currentSubtitlesTimeline',
    ]),

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

      // doc 画中画窗口 document
      pipWindow: null,

      /**
       * 视频画中画 video
       */
      ...(() => {
        if (window.documentPictureInPicture) {
          return {
            videoDom: null,
          };
        }
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // 创建假视频流
        const stream = canvas.captureStream(30); // 30fps
        const videoDom = document.createElement('video');
        videoDom.srcObject = stream;
        videoDom.style.cssText =
          'position:fixed;bottom:10px;left:10px;width:400px;height:100px;pointer-events:none;z-index:-1;opacity:0;';
        document.body.appendChild(videoDom);
        return {
          videoDom,
          videoCtx: ctx,
        };
      })(),
    };
  },

  watch: {
    /** 监视 hasPictureInPicture */
    async hasPictureInPicture(newVal) {
      if (window.documentPictureInPicture) {
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
          this.hideLyrics = false; // 显示字幕
          if (window.documentPictureInPicture.window) {
            window.documentPictureInPicture.window.close();
          }
        }
        return;
      }

      console.warn('当前浏览器不支持 document Picture-in-Picture');
      // 都不支持，直接退出
      // this.switchPictureInPicture();
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

      // 更新画中画视频的歌词
      if (this.videoDom) {
        const ctx = this.videoCtx;
        ctx.clearRect(0, 0, 1024, 256);
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, 1024, 256);

        if (this.currentLyric) {
          const maxWidth = 1000;
          const canvasWidth = 1024;
          const canvasHeight = 256;
          let fontSize = 48;
          let font = `${fontSize}px sans-serif`;
          ctx.font = font;

          const text = this.currentLyric;
          const textWidth = ctx.measureText(text).width;

          if (textWidth <= maxWidth) {
            // 一行能显示完整
            ctx.font = font;
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, canvasWidth / 2, canvasHeight / 2);
          } else {
            // 尝试分两行
            // 先暴力拆分
            let splitIdx = text.length - 1;
            let firstLine = text;
            let secondLine = '';
            // 找到第一行最大能显示的字数
            for (let i = 1; i < text.length; i++) {
              const part = text.slice(0, i);
              if (ctx.measureText(part).width > maxWidth) {
                splitIdx = i - 1;
                break;
              }
            }
            firstLine = text.slice(0, splitIdx);
            secondLine = text.slice(splitIdx);

            // 检查两行是否都能小于 maxWidth
            if (ctx.measureText(firstLine).width <= maxWidth && ctx.measureText(secondLine).width <= maxWidth) {
              ctx.font = font;
              ctx.fillStyle = 'white';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(firstLine, canvasWidth / 2, canvasHeight / 2 - fontSize / 1.5);
              ctx.fillText(secondLine, canvasWidth / 2, canvasHeight / 2 + fontSize / 1.5);
            } else {
              // 两行都超出，等比例缩小字体
              let scale = maxWidth / Math.max(ctx.measureText(firstLine).width, ctx.measureText(secondLine).width);
              let scaledFontSize = Math.floor(fontSize * scale);
              ctx.font = `${scaledFontSize}px sans-serif`;
              ctx.fillStyle = 'white';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(firstLine, canvasWidth / 2, canvasHeight / 2 - scaledFontSize / 1.5);
              ctx.fillText(secondLine, canvasWidth / 2, canvasHeight / 2 + scaledFontSize / 1.5);
            }
          }
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

    /**
     *
     * @param {number} time 秒
     */
    currentTime(time) {
      if (this.videoDom) {
        this.videoDom.currentTime = time;
      }
    },
  },

  methods: {
    ...mapMutations('AudioPlayer', {
      togglePlaying: 'TOGGLE_PLAYING',
      switchPictureInPicture: 'TOGGLE_PICTURE_IN_PICTURE',
      setOpenPictureInPicture: 'SET_OPEN_PICTURE_IN_PICTURE',
    }),

    /**
     * 在画中画窗口中添加播放/暂停按钮的事件监听
     */
    attachPipPlayToggleHandler() {
      if (this.pipWindow && this.pipWindow.document) {
        const pipDoc = this.pipWindow.document;
        const btn = pipDoc.getElementById('pip-play-toggle');
        if (btn) {
          btn.onclick = () => {
            this.togglePlaying();
          };
        }
      }
    },

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

    document.addEventListener('leavepictureinpicture', () => {
      this.switchPictureInPicture();
      this.hideLyrics = false;
    });

    if (this.videoDom) {
      this.videoDom
        .play()
        .then(() => {
          console.log('视频画中画已准备就绪');
        })
        .catch(e => {
          console.warn(e);
        });

      this.videoDom.onplay = () => {
        this.togglePlaying(true);
      };
      this.videoDom.onpause = () => {
        this.togglePlaying(false);
      };
    }

    this.setOpenPictureInPicture(() => {
      if (!this.videoDom) {
        return;
      }
      if (this.hasPictureInPicture) {
        this.videoDom
          .requestPictureInPicture()
          .then(() => {
            this.hideLyrics = true;
          })
          .catch(e => {
            console.warn(e);
          });
      } else {
        if (document.pictureInPictureElement) {
          document.exitPictureInPicture();
        }
        this.hideLyrics = false;
      }
    });
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
