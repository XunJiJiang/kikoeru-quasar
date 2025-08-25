<template>
  <vue-plyr
    ref="plyr"
    style="background-color: #fff0;"
    :emit="['canplay', 'timeupdate', 'ended', 'seeked', 'playing', 'waiting', 'pause']"
    @canplay="onCanplay()"
    @timeupdate="onTimeupdate()"
    @ended="onEnded()"
    @seeked="onSeeked()"
    @playing="onPlaying()"
    @waiting="onWaiting()"
    @pause="onPause()"
  >
    <audio crossorigin="anonymous">
      <source v-if="source" :src="source" />
    </audio>
  </vue-plyr>
</template>

<script>
import Lyric from 'lrc-file-parser';
import { WebVTT } from 'vtt.js';
import { mapState, mapGetters, mapMutations } from 'vuex';
import NotifyMixin from '../mixins/Notification.js';

export default {
  name: 'AudioElement',

  mixins: [NotifyMixin],

  data() {
    return {
      lrcObj: null, // LRC对象
      vttCues: [], // VTT cue数组
      subtitleType: null, // 'lrc' | 'vtt' | null
      lrcAvailable: false,
      isSeeking: false, // 拖动进度条标志
    };
  },

  computed: {
    player() {
      return this.$refs.plyr.player;
    },

    source() {
      // 从 LocalStorage 中读取 token
      const token = this.$q.localStorage.getItem('jwt-token') || '';
      // New API
      if (this.currentPlayingFile.mediaStreamUrl) {
        return `${this.currentPlayingFile.mediaStreamUrl}?token=${token}`;
      } else if (this.currentPlayingFile.hash) {
        // Fallback to be compatible with old backend
        return `/api/media/stream/${this.currentPlayingFile.hash}?token=${token}`;
      } else {
        return '';
      }
    },

    ...mapState('AudioPlayer', [
      'playing',
      'queue',
      'queueIndex',
      'playMode',
      'muted',
      'volume',
      'sleepTime',
      'sleepMode',
      'rewindSeekTime',
      'forwardSeekTime',
      'rewindSeekMode',
      'forwardSeekMode',
      'currentSubtitlesFile',
      'currentSubtitlesHash',
      'subtitlesDelay',
    ]),

    ...mapGetters('AudioPlayer', ['currentPlayingFile']),
  },

  watch: {
    playing(flag) {
      if (this.isSeeking) return; // 拖动进度条时不响应
      if (this.player.duration) {
        // 缓冲至可播放状态
        flag ? this.player.play() : this.player.pause();
      }
      // this.playLrc(flag);
    },

    // watch source -> media.load() -> canPlay -> player.play()
    source(url) {
      if (url) {
        // 加载新音频/视频文件
        this.player.media.load();
        this.findLoadLrcFile();
      }
    },

    muted(flag) {
      // 切换静音状态
      this.player.muted = flag;
    },

    volume(val) {
      // 屏蔽非法数值
      if (val < 0 || val > 1) {
        return;
      }

      // 调节音量
      this.player.volume = val;
    },
    rewindSeekMode(rewind) {
      if (rewind) {
        this.player.rewind(this.rewindSeekTime);
        this.SET_REWIND_SEEK_MODE(false);
      }
    },
    forwardSeekMode(forward) {
      if (forward) {
        this.player.forward(this.forwardSeekTime);
        this.SET_FORWARD_SEEK_MODE(false);
      }
    },
    currentSubtitlesHash(hash, oldHash) {
      if (hash && hash !== oldHash) {
        console.log('当前字幕文件哈希:', hash);
        this.loadLrcFile(hash);
      }
    },

    subtitlesDelay(delay) {
      // 字幕播放时差变化时, 重启 lrc 播放器
      if (this.lrcAvailable && this.lrcObj && this.playing) {
        this.lrcObj.pause();
        this.lrcObj.play(this.player.currentTime * 1000 + delay);
      }
    },
  },

  methods: {
    /**
     * 当 外部暂停（线控暂停、软件切换）、用户控制暂停、seek 时会触发本事件
     */
    onPause() {
      // console.log('onPause')
      this.playLrc(false);
      this.PAUSE();
    },
    /**
     * 当播放器真正开始播放时会触发本事件
     */
    onPlaying() {
      this.playLrc(true);
      this.PLAY();
    },
    /**
     * 当播放器缓冲区空，被迫暂停加载时会触发本事件
     */
    onWaiting() {
      // console.log('waiting')
      this.playLrc(false);
      this.PLAY();
    },
    ...mapMutations('AudioPlayer', [
      'SET_DURATION',
      'SET_CURRENT_TIME',
      'PAUSE',
      'PLAY',
      'SET_TRACK',
      'NEXT_TRACK',
      'SET_CURRENT_LYRIC',
      'SET_VOLUME',
      'CLEAR_SLEEP_MODE',
      'SET_REWIND_SEEK_MODE',
      'SET_FORWARD_SEEK_MODE',
      'SET_CURRENT_SUBTITLE_FILE',
      'SET_CURRENT_SUBTITLE_HASH',
      'SET_CURRENT_SUBTITLE_TIMELINE',
    ]),

    onCanplay() {
      // 缓冲至可播放状态时触发 (只有缓冲至可播放状态, 才能获取媒体文件的播放时长)
      this.SET_DURATION(this.player.duration);

      // 播放
      if (this.playing && this.player.currentTime !== this.player.duration) {
        this.player.play();
      }
    },

    onTimeupdate() {
      // 当目前的播放位置已更改时触发
      this.SET_CURRENT_TIME(this.player.currentTime);
      if (this.sleepMode && this.sleepTime) {
        const currentTime = new Date();
        const currentHourStr = currentTime
          .getHours()
          .toString()
          .padStart(2, '0');
        const currentMinuteStr = currentTime
          .getMinutes()
          .toString()
          .padStart(2, '0');
        const sleepHourStr = this.sleepTime.match(/\d+/g)[0];
        const sleepMinuteStr = this.sleepTime.match(/\d+/g)[1];
        if (currentHourStr === sleepHourStr && currentMinuteStr === sleepMinuteStr) {
          this.PAUSE();
          this.CLEAR_SLEEP_MODE();
          // Persist sleep mode settings
          this.$q.sessionStorage.set('sleepTime', null);
          this.$q.sessionStorage.set('sleepMode', false);
        }
      }

      if (this.lrcAvailable && this.subtitleType === 'vtt' && this.vttCues.length > 0) {
        const t = this.player.currentTime + this.subtitlesDelay / 1000;
        const cue = this.vttCues.find(c => t >= c.start && t <= c.end);
        if (cue) {
          this.SET_CURRENT_LYRIC(cue.text);
        } else {
          this.SET_CURRENT_LYRIC('');
        }
      }
    },

    onEnded() {
      // 当前文件播放结束时触发
      switch (this.playMode.name) {
        case 'all repeat':
          // 循环播放
          if (this.queueIndex === this.queue.length - 1) {
            this.SET_TRACK(0);
          } else {
            this.NEXT_TRACK();
          }
          break;
        case 'repeat once':
          // 单曲循环
          this.player.currentTime = 0;
          this.player.play();
          this.PLAY();
          break;
        case 'shuffle': {
          // 随机播放
          const index = Math.floor(Math.random() * this.queue.length);
          this.SET_TRACK(index);
          if (index === this.queueIndex) {
            this.player.currentTime = 0;
          }
          break;
        }
        default:
          // 顺序播放
          if (this.queueIndex === this.queue.length - 1) {
            this.PAUSE();
          } else {
            this.NEXT_TRACK();
          }
      }
    },

    onSeeked() {
      if (this.lrcAvailable && this.lrcObj && this.playing) {
        this.lrcObj.pause();
        this.lrcObj.play(this.player.currentTime * 1000 + this.subtitlesDelay);
      }
    },

    playLrc(playStatus) {
      if (!this.lrcAvailable) return;
      if (this.subtitleType === 'lrc') {
        if (playStatus) {
          this.lrcObj.play(this.player.currentTime * 1000 + this.subtitlesDelay);
        } else {
          this.lrcObj.pause();
        }
      } else if (this.subtitleType === 'vtt') {
        // VTT不需要play/pause，直接在timeupdate里处理
      }
    },

    initLrcObj() {
      this.lrcObj = new Lyric({
        onPlay: (line, text) => {
          if (this.subtitleType === 'lrc') {
            this.SET_CURRENT_LYRIC(text);
          }
        },
      });
    },

    /**
     * 加载指定 hash 的字幕文件
     * @param {string} hash - 字幕文件的哈希值
     */
    loadLrcFile(hash) {
      const token = this.$q.localStorage.getItem('jwt-token') || '';
      this.lrcAvailable = true;
      this.subtitleType = null;
      const lrcUrl = `/api/media/stream/${hash}?token=${token}`;
      this.$axios.get(lrcUrl).then(response => {
        const text = response.data;
        // 判断格式
        if (/^\s*WEBVTT/i.test(text) || /\d{2}:\d{2}:\d{2}\.\d{3} -->/.test(text)) {
          // VTT格式
          console.log('字幕格式: VTT');
          this.subtitleType = 'vtt';
          this.SET_CURRENT_SUBTITLE_FILE(text);
          this.SET_CURRENT_SUBTITLE_HASH(hash);
          this.parseVtt(text);
          this.SET_CURRENT_SUBTITLE_TIMELINE(
            this.vttCues.map(({ start, text }) => ({
              time: start * 1000,
              text,
            }))
          );
        } else if (/\[\d{1,2}:\d{2}(?:\.\d{1,2})?\]/.test(text)) {
          // LRC格式
          console.log('字幕格式: LRC');
          this.subtitleType = 'lrc';
          this.SET_CURRENT_SUBTITLE_FILE(text);
          this.SET_CURRENT_SUBTITLE_HASH(hash);
          this.lrcObj.setLyric(text);
          this.SET_CURRENT_SUBTITLE_TIMELINE(this.lrcObj.lines);
          this.lrcObj.play(this.player.currentTime * 1000 + this.subtitlesDelay);
        } else {
          // 未知格式
          console.warn('未知字幕格式', text.slice(0, 100));
          this.subtitleType = null;
          this.SET_CURRENT_SUBTITLE_FILE('');
          this.SET_CURRENT_SUBTITLE_HASH('');
          this.SET_CURRENT_SUBTITLE_TIMELINE([]);
          this.lrcAvailable = false;
          this.lrcObj.setLyric('');
          this.SET_CURRENT_LYRIC('');
          this.vttCues = [];
        }
      });
    },

    /** 查找并加载歌词文件 */
    findLoadLrcFile() {
      const token = this.$q.localStorage.getItem('jwt-token') || '';
      const fileHash = this.queue[this.queueIndex].hash;
      const url = `/api/media/check-lrc/${fileHash}?token=${token}`;

      this.$axios
        .get(url)
        .then(response => {
          if (response.data.result) {
            this.loadLrcFile(response.data.hash);
          } else {
            // 无歌词文件
            this.lrcAvailable = false;
            this.subtitleType = null;
            this.SET_CURRENT_SUBTITLE_FILE('');
            this.SET_CURRENT_SUBTITLE_HASH('');
            this.SET_CURRENT_SUBTITLE_TIMELINE([]);
            this.lrcObj.setLyric('');
            this.SET_CURRENT_LYRIC('');
            this.vttCues = [];
          }
        })
        .catch(error => {
          if (error.response) {
            if (error.response.status !== 401) {
              this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`);
            }
          } else {
            this.showErrNotif(error.message || error);
          }
        });
    },

    /**
     * 解析VTT文本，填充vttCues
     * @param {string} text
     */
    parseVtt(text) {
      // 解析VTT文本，填充vttCues
      this.vttCues = [];
      try {
        const parser = new WebVTT.Parser(window);
        // 这个居然可以同步执行
        parser.oncue = cue => {
          this.vttCues.push({
            start: cue.startTime,
            end: cue.endTime,
            text: cue.text,
          });
        };
        parser.onparsingerror = e => {
          console.error('VTT解析错误', e);
        };
        // 直接赋值buffer并parse()
        parser.buffer = text;
        parser.parse();
        parser.flush();
      } catch (e) {
        this.vttCues = [];
        this.lrcAvailable = false;
        this.SET_CURRENT_SUBTITLE_FILE('');
        this.SET_CURRENT_SUBTITLE_HASH('');
        this.SET_CURRENT_SUBTITLE_TIMELINE([]);
        this.SET_CURRENT_LYRIC('');
        console.error('VTT解析异常', e);
      }
    },

    /**
     * 通过设置plyr播放位置（单位：毫秒）
     * @param {number} ms - 目标播放位置，单位毫秒
     */
    setCurrentTimeMs(ms) {
      if (this.player && typeof ms === 'number' && !isNaN(ms)) {
        this.player.currentTime = ms / 1000;
      }
    },
  },

  mounted() {
    // 初始化音量
    this.SET_VOLUME(this.player.volume);
    this.initLrcObj();
    if (this.source) {
      this.findLoadLrcFile();
    }
    // 监听 plyr 的 seeking/seeked 事件
    const plyr = this.$refs.plyr;
    if (plyr && plyr.player) {
      plyr.player.on('seeking', () => {
        this.isSeeking = true;
      });
      plyr.player.on('seeked', () => {
        // seeked 事件后短暂延迟，避免极快切换
        setTimeout(() => {
          this.isSeeking = false;
        }, 100);
      });
    }
  },
};
</script>

<style>
.plyr--audio .plyr__controls {
  background: inherit !important;
  padding: 0 !important;
}
</style>
