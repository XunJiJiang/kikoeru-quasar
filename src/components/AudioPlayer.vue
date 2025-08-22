<template>
  <div class="audio-player-container">
    <!-- 播放器 -->
    <q-slide-transition class="relative">
      <q-card
        square
        v-show="currentPlayingFile.hash && !hide"
        class="fixed-bottom-right bg-white text-black audio-player"
        @mousewheel.prevent
        @touchmove.prevent
      >
        <!-- 音声封面 -->
        <div class="bg-dark row items-center albumart">
          <custom-img contain transition="fade" :src="coverUrl" :ratio="4 / 3" />
          <q-btn
            dense
            size="md"
            @click="toggleHide()"
            class="absolute"
            style="background-color: #fffa; width: 100px; height: 6px; overflow: hidden; left: 50%; top: 10px; transform: translateX(-50%); z-index: 1;"
          />
        </div>

        <q-card class="options-container" style="background-color: #fff8; backdrop-filter: blur(15px);">
          <!-- Place holder for iOS -->
          <div style="height: 5px" v-if="$q.platform.is.ios" />

          <q-item style="height: 55px; padding: 8px 15px 0 15px;" class="text-center non-selectable">
            <q-item-section>
              <q-item-label lines="2" class="text-bold">{{ currentPlayingFile.title }}</q-item-label>
              <q-item-label caption lines="1">{{ currentPlayingFile.workTitle }}</q-item-label>
            </q-item-section>
          </q-item>

          <!-- Place holder for iOS -->
          <div style="height: 10px" v-if="$q.platform.is.ios" />

          <!-- 进度条控件 -->
          <div class="column items-center q-mx-sm q-my-sm" style="height: 45px;">
            <div style="width: 100%;">
              <AudioElement ref="audio-element" class="col" />
            </div>
            <div class="row justify-between q-mt-xs" style="width: 100%;">
              <div class="col-auto">{{ formatSeconds(currentTime) }}</div>
              <div class="col-auto">{{ formatSeconds(duration) }}</div>
            </div>
          </div>

          <!-- 播放按钮控件 -->
          <div class="row justify-around" style="height: 55px;">
            <q-btn
              flat
              dense
              size="lg"
              :icon="swapSeekButton ? rewindIcon : 'skip_previous'"
              @click="swapSeekButton ? rewind(true) : previousTrack()"
              style="width: 45px"
              class="col-auto"
            />
            <q-btn
              v-if="!hideSeekButton"
              flat
              dense
              size="lg"
              color="white"
              text-color="dark"
              style="opacity: 0.8"
              @click="swapSeekButton ? previousTrack() : rewind(true)"
              :icon="swapSeekButton ? 'skip_previous' : rewindIcon"
            />
            <q-btn
              flat
              dense
              size="28px"
              :icon="playingIcon"
              @click="togglePlaying()"
              style="width: 55px"
              class="col-auto"
            />
            <q-btn
              v-if="!hideSeekButton"
              flat
              dense
              size="lg"
              color="white"
              text-color="dark"
              style="opacity: 0.8"
              @click="swapSeekButton ? nextTrack() : forward(true)"
              :icon="swapSeekButton ? 'skip_next' : forwardIcon"
            />
            <q-btn
              flat
              dense
              size="lg"
              :icon="swapSeekButton ? forwardIcon : 'skip_next'"
              @click="swapSeekButton ? forward(true) : nextTrack()"
              style="width: 45px"
              class="col-auto"
            />
          </div>

          <!-- 音量控件 -->
          <!-- HTML5 volume in iOS is read-only -->
          <div class="row items-center q-mx-lg" style="height: 50px;" v-if="!$q.platform.is.ios">
            <q-icon name="volume_down" size="sm" class="col-auto" />
            <vue-slider
              v-model="volume"
              :min="0"
              :max="1"
              :interval="0.01"
              :dragOnClick="true"
              :contained="true"
              tooltip="none"
              class="col"
            />
            <q-icon name="volume_up" size="sm" class="col-auto" />
          </div>

          <div class="row justify-center" style="height: 45px; gap: 5px;">
            <q-btn
              flat
              dense
              size="md"
              icon="queue_music"
              @click="showCurrentPlayList = !showCurrentPlayList"
              style="height: 35px; width: 40px"
              class="col-auto"
            />
            <q-btn
              flat
              dense
              size="md"
              :icon="playModeIcon"
              @click="changePlayMode()"
              style="height: 35px; width: 40px"
              class="col-auto"
            />
            <q-btn
              flat
              dense
              size="md"
              icon="picture_in_picture_alt"
              :disabled="!currentSubtitlesHash"
              @click="_switchPictureInPicture()"
              style="height: 35px; width: 40px"
              class="col-auto"
            />
            <q-btn
              flat
              dense
              size="md"
              icon="subtitles"
              @click="visibleSubtitlesSelectBar = !visibleSubtitlesSelectBar"
              style="height: 35px; width: 40px"
              class="col-auto"
            />

            <q-dialog v-model="visibleSubtitlesSelectBar">
              <q-layout container style="background-color: #fff;">
                <q-header class="bg-white">
                  <q-bar>
                    <q-select
                      dense
                      v-model="currentSubtitlesItem"
                      :options="currentAllSubtitlesFiles"
                      option-label="title"
                      option-value="hash"
                      option-dense
                      style="max-width: calc(100% - 40px);"
                    />
                    <q-space />
                    <q-btn dense flat icon="close" v-close-popup>
                      <q-tooltip>Close</q-tooltip>
                    </q-btn>
                  </q-bar>
                </q-header>
                <q-footer style="height: 30px;">
                  <div>Footer</div>
                </q-footer>
                <q-card style="margin: 30px 0; border-radius: 0;">
                  <q-list>
                    <q-item
                      v-for="(item, index) in currentSubtitlesTimeline"
                      :key="index"
                      clickable
                      @click="setCurrentTimeMs(item.time)"
                    >
                      <q-item-section>
                        <q-item-label caption>{{ formatSeconds(Math.floor(item.time / 1000)) }}</q-item-label>
                        <q-item-label>{{ item.text }}</q-item-label></q-item-section
                      >
                    </q-item>
                  </q-list>
                </q-card>
              </q-layout>
            </q-dialog>

            <q-btn
              flat
              dense
              size="md"
              color="white"
              style="height: 35px; width: 40px"
              text-color="dark"
              icon="more_vert"
            >
              <q-menu anchor="bottom right" self="top right">
                <q-item clickable v-ripple @click="hideSeekButton = !hideSeekButton">
                  <q-item-section avatar>
                    <q-icon :name="hideSeekButton ? 'done' : ''" />
                  </q-item-section>

                  <q-item-section>
                    隐藏封面按钮
                  </q-item-section>
                </q-item>

                <q-item clickable v-ripple @click="swapSeekButton = !swapSeekButton">
                  <q-item-section avatar>
                    <q-icon :name="swapSeekButton ? 'done' : ''" />
                  </q-item-section>
                  <q-item-section>
                    交换进度按钮与切换按钮
                  </q-item-section>
                </q-item>

                <q-item clickable v-ripple @click="openWorkDetail()" v-close-popup>
                  <q-item-section avatar>
                    <!-- placeholder -->
                  </q-item-section>
                  <q-item-section>
                    打开作品详情
                  </q-item-section>
                </q-item>
              </q-menu>
            </q-btn>
          </div>
        </q-card>
      </q-card>
    </q-slide-transition>

    <!-- 当前播放列表 -->
    <q-dialog v-model="showCurrentPlayList">
      <q-card class="current-play-list">
        <!-- 操作当前播放列表的控制按钮 -->
        <div class="row" style="padding: 5px; height: 45px;">
          <q-btn
            dense
            round
            size="md"
            icon="edit"
            color="primary"
            @click="editCurrentPlayList = !editCurrentPlayList"
            style="height: 35px; width: 35px;"
            class="col-auto"
          />
          <q-btn
            dense
            round
            size="md"
            icon="save"
            color="teal"
            style="height: 35px; width: 35px;"
            class="col-auto q-mx-sm"
          />
          <q-space />
          <q-btn
            dense
            round
            size="md"
            icon="delete_forever"
            color="red"
            @click="emptyQueue()"
            style="height: 35px; width: 35px;"
            class="col-auto"
          />
        </div>

        <q-separator />

        <!-- 音频文件列表 -->
        <q-list style="max-height: 450px" class="scroll">
          <draggable handle=".handle" v-model="queueCopy" @change="val => onMoved(val.moved)">
            <q-item
              clickable
              v-ripple
              v-for="(track, index) in queueCopy"
              :key="index"
              :active="queueIndex === index"
              active-class="text-white bg-teal"
              class="non-selectable"
              style="height: 48px; padding: 0px 10px;"
              @click="onClickTrack(index)"
            >
              <q-item-section side v-show="editCurrentPlayList">
                <q-icon name="clear" :color="queueIndex === index ? 'white' : 'red'" @click="removeFromQueue(index)" />
              </q-item-section>

              <q-item-section avatar>
                <q-img
                  transition="fade"
                  :src="samCoverUrl(track.hash)"
                  style="height: 38px; width: 38px"
                  class="rounded-borders"
                />
              </q-item-section>

              <q-item-section>
                <q-item-label lines="1">{{ track.title }}</q-item-label>
                <q-item-label caption lines="1">{{ track.workTitle }}</q-item-label>
              </q-item-section>

              <q-item-section side class="handle" v-show="editCurrentPlayList">
                <q-icon name="reorder" :color="queueIndex === index ? 'white' : 'dark'" />
              </q-item-section>
            </q-item>
          </draggable>
        </q-list>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import draggable from 'vuedraggable';
import AudioElement from 'components/AudioElement';
import { mapState, mapGetters, mapMutations } from 'vuex';
import CustomImg from './CustomImg.vue';

export default {
  name: 'AudioPlayer',

  components: {
    draggable,
    AudioElement,
    CustomImg,
  },

  data() {
    return {
      showCurrentPlayList: false,
      editCurrentPlayList: false,
      queueCopy: [],
      hideSeekButton: false,
      swapSeekButton: false,

      visibleSubtitlesSelectBar: false, // 字幕选择窗口显示状态
      currentAllSubtitlesFiles: [], // 当前所有字幕文件
      currentSubtitlesItem: null, // 当前选中的字幕文件
    };
  },

  mounted() {
    if (this.$q.localStorage.has('hideSeekButton')) {
      this.hideSeekButton = this.$q.localStorage.getItem('hideSeekButton');
    }
    if (this.$q.localStorage.has('swapSeekButton')) {
      this.swapSeekButton = this.$q.localStorage.getItem('swapSeekButton');
    }
  },

  watch: {
    queue(val) {
      this.queueCopy = val.concat();
      // 在删除最后一个 track 时关闭当前播放列表
      if (this.queueCopy.length === 0) {
        this.showCurrentPlayList = false;
      }

      // 切换播放列表时, 获取当前所有字幕文件
      if (this.queueCopy.length !== 0) {
        const token = this.$q.localStorage.getItem('jwt-token') || '';
        const fileHash = this.queue[this.queueIndex].hash;
        this.lrcAvailable = true;
        this.subtitleType = null;
        const lrcUrl = `/api/media/find-all-lrc/${fileHash}?token=${token}`;
        this.$axios
          .get(lrcUrl)
          .then(response => {
            this.currentAllSubtitlesFiles = response.data.subtitlesItems;
          })
          .catch(() => {
            this.currentAllSubtitlesFiles = [];
          });
      } else {
        this.currentAllSubtitlesFiles = [];
      }
    },

    showCurrentPlayList(flag) {
      // 关闭当前播放列表后，重置 editCurrentPlayList 状态为 false
      if (flag === false) {
        this.editCurrentPlayList = false;
      }
    },

    hideSeekButton(option) {
      this.$q.localStorage.set('hideSeekButton', option);
    },

    swapSeekButton(option) {
      this.$q.localStorage.set('swapSeekButton', option);
    },

    currentSubtitlesHash(hash) {
      if (hash) {
        this.currentSubtitlesItem = this.currentAllSubtitlesFiles.find(item => item.hash === hash);
      } else {
        this.currentSubtitlesItem = null;
      }
    },

    currentSubtitlesItem(item) {
      if (item) {
        this.setCurrentSubtitlesHash(item.hash);
      }
    },
  },

  computed: {
    coverUrl() {
      // 从 LocalStorage 中读取 token
      const token = this.$q.localStorage.getItem('jwt-token') || '';
      const hash = this.currentPlayingFile.hash;
      return hash ? `/api/cover/${hash.split('/')[0]}?token=${token}` : '';
    },

    workDetailUrl() {
      const hash = this.currentPlayingFile.hash;
      return hash ? `/work/${hash.split('/')[0]}` : '';
    },

    volume: {
      get() {
        return this.$store.state.AudioPlayer.volume;
      },
      set(val) {
        this.SET_VOLUME(val);
      },
    },

    queue: {
      get() {
        return this.$store.state.AudioPlayer.queue;
      },
      set() {},
    },

    playModeIcon() {
      switch (this.playMode.name) {
        case 'all repeat':
          return 'repeat';
        case 'repeat once':
          return 'repeat_one';
        case 'shuffle':
          return 'shuffle';
        default:
          return 'playlist_play';
      }
    },

    playingIcon() {
      return this.playing ? 'pause' : 'play_arrow';
    },

    rewindIcon() {
      switch (this.rewindSeekTime) {
        case 5:
          return 'replay_5';
        case 10:
          return 'replay_10';
        case 30:
          return 'replay_30';
        default:
          return 'replay_5';
      }
    },

    forwardIcon() {
      switch (this.forwardSeekTime) {
        case 5:
          return 'forward_5';
        case 10:
          return 'forward_10';
        case 30:
          return 'forward_30';
        default:
          return 'forward_5';
      }
    },

    ...mapState('AudioPlayer', [
      'playing',
      'hide',
      'currentTime',
      'duration',
      'queueIndex',
      'playMode',
      'rewindSeekTime',
      'forwardSeekTime',
      'hasPictureInPicture',
      'currentSubtitlesHash',
      'currentSubtitlesTimeline',
      'openPictureInPicture',
    ]),

    ...mapGetters('AudioPlayer', ['currentPlayingFile']),
  },

  methods: {
    ...mapMutations('AudioPlayer', {
      toggleHide: 'TOGGLE_HIDE',
      togglePlaying: 'TOGGLE_PLAYING',
      nextTrack: 'NEXT_TRACK',
      previousTrack: 'PREVIOUS_TRACK',
      changePlayMode: 'CHANGE_PLAY_MODE',
      setVolume: 'SET_VOLUME',
      rewind: 'SET_REWIND_SEEK_MODE',
      forward: 'SET_FORWARD_SEEK_MODE',
      switchPictureInPicture: 'TOGGLE_PICTURE_IN_PICTURE',
      setCurrentSubtitlesHash: 'SET_CURRENT_SUBTITLE_HASH',
    }),
    ...mapMutations('AudioPlayer', ['SET_TRACK', 'SET_QUEUE', 'REMOVE_FROM_QUEUE', 'EMPTY_QUEUE', 'SET_VOLUME']),

    /** 为了确保视频画中画窗口打开事件同步触发 */
    _switchPictureInPicture() {
      this.switchPictureInPicture();

      this.openPictureInPicture();
    },

    formatSeconds(seconds) {
      let h = Math.floor(seconds / 3600) < 10 ? '0' + Math.floor(seconds / 3600) : Math.floor(seconds / 3600);

      let m =
        Math.floor((seconds / 60) % 60) < 10 ? '0' + Math.floor((seconds / 60) % 60) : Math.floor((seconds / 60) % 60);

      let s = Math.floor(seconds % 60) < 10 ? '0' + Math.floor(seconds % 60) : Math.floor(seconds % 60);

      return h === '00' ? m + ':' + s : h + ':' + m + ':' + s;
    },

    samCoverUrl(hash) {
      // 从 LocalStorage 中读取 token
      const token = this.$q.localStorage.getItem('jwt-token') || '';
      return hash ? `/api/cover/${hash.split('/')[0]}?type=sam&token=${token}` : '';
    },

    onClickTrack(index) {
      if (!this.editCurrentPlayList) {
        this.SET_TRACK(index);
        this.showCurrentPlayList = false;
      }
    },

    onMoved(moved) {
      let index = null;
      if (moved.oldIndex === this.queueIndex) {
        index = moved.newIndex;
      } else if (moved.oldIndex < this.queueIndex && moved.newIndex >= this.queueIndex) {
        index = this.queueIndex - 1;
      } else if (moved.oldIndex > this.queueIndex && moved.newIndex <= this.queueIndex) {
        index = this.queueIndex + 1;
      } else {
        index = this.queueIndex;
      }

      this.SET_QUEUE({
        queue: this.queueCopy.concat(),
        index: index,
        resetPlaying: false,
      });
    },

    removeFromQueue(index) {
      this.REMOVE_FROM_QUEUE(index);
    },

    emptyQueue() {
      this.EMPTY_QUEUE();
    },

    openWorkDetail() {
      if (this.workDetailUrl && this.$route.path !== this.workDetailUrl) {
        this.$router.push(this.workDetailUrl);
      }
      if (this.$q.screen.lt.sm) {
        this.toggleHide();
      }
    },

    /** 切换当前时间线 */
    setCurrentTimeMs(ms) {
      if (this.$refs['audio-element']) {
        this.$refs['audio-element'].setCurrentTimeMs(ms);
        this.visibleSubtitlesSelectBar = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.audio-player {
  // 宽度 > $breakpoint-sm-min
  @media (min-width: $breakpoint-sm-min) {
    width: 330px;
    max-height: calc(100vh - 20px);
    margin: 0px 10px 10px 0px;
    height: 100%;
  }
  // 宽度 < $breakpoint-xs-max (599px)
  @media (max-width: $breakpoint-xs-max) {
    width: 100%;
    height: 100%;
  }
}

.albumart {
  @media (min-width: $breakpoint-sm-min) {
    max-height: calc(95vh - 267px);

    position: absolute;
    bottom: 267px;
    left: 0;
    right: 0;
  }
  // 宽度 < $breakpoint-xs-max (599px)
  @media (max-width: $breakpoint-xs-max) {
    width: 100%;
    height: calc(100% - 267px);
  }
}

.options-container {
  @media (min-width: $breakpoint-sm-min) {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    height: 267px;
  }
}

.current-play-list {
  max-height: 500px;

  // 宽度 > $breakpoint-xs-max
  @media (min-width: $breakpoint-xs-max) {
    width: 450px;
  }
  // 宽度 < $breakpoint-xs-max (599px)
  @media (max-width: $breakpoint-xs-max) {
    min-width: 267px;
  }
}
</style>
