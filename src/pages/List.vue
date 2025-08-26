<template>
  <div>
    <div class="text-h5 text-weight-regular q-ma-md">All {{ restrict }}</div>

    <div class="row justify-center q-pb-xl q-pt-none">
      <div class="col-11">
        <q-input
          ref="search-input"
          dense
          rounded
          outlined
          v-model="keyword"
          :placeholder="`Search for ${restrict}...`"
          class="q-mb-md"
          @keyup.enter="enterHandler"
        >
          <template v-slot:prepend>
            <q-item ref="selected-items" class="selected-items">
              <q-item-section v-for="item in selectedItems" :key="item.id" class="selected-item">
                <span>{{ item.name }}</span>
                <q-btn round dense flat size="xs" icon="close" @click="removeSelectedItem(item)" />
              </q-item-section>
            </q-item>
          </template>
          <template v-slot:append>
            <q-icon
              v-if="keyword !== ''"
              name="clear"
              class="cursor-pointer"
              style="margin-right: 8px"
              @click="clearHandler"
            />
            <q-icon name="search" class="cursor-pointer" @click="enterHandler" />
          </template>
        </q-input>

        <div class="row justify-center q-gutter-sm">
          <div class="col-auto" v-for="item in keyword ? filteredItems : items" :key="item.id">
            <q-btn
              no-caps
              rounded
              color="primary"
              :label="`${item.name} (${item.count})`"
              @click="addSelectedItem(item)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import NotifyMixin from '../mixins/Notification.js';

export default {
  name: 'List',

  mixins: [NotifyMixin],

  props: {
    restrict: {
      type: String,
    },
  },

  data() {
    return {
      items: [], // 所有项
      selectedItems: [], // 选中项
      keyword: '', // 搜索关键词
    };
  },

  created() {
    this.requestList();
  },

  computed: {
    url() {
      return `/api/${this.restrict}/`;
    },

    queryField() {
      switch (this.restrict) {
        case 'circles':
          return 'circleId';
        case 'tags':
          return 'tagId';
        case 'vas':
          return 'vaId';
        default:
          return 'circleId';
      }
    },

    filteredItems() {
      return this.items.filter(item => item.name.toLowerCase().indexOf(this.keyword.toLowerCase()) !== -1);
    },
  },

  watch: {
    url() {
      this.requestList();
      this.selectedItems = [];
    },

    selectedItems() {
      this.$refs['search-input'].focus();
    },
  },

  methods: {
    requestList() {
      this.$axios
        .get(this.url)
        .then(response => {
          this.items = response.data.concat();
        })
        .catch(error => {
          if (error.response) {
            // 请求已发出，但服务器响应的状态码不在 2xx 范围内
            if (error.response.status !== 401) {
              this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`);
            }
          } else {
            this.showErrNotif(error.message || error);
          }
        });
    },

    /**
     * 添加选中项
     */
    addSelectedItem(item) {
      switch (this.restrict) {
        case 'circles':
        case 'vas':
          this.$router.push(`/works?${this.queryField}=${item.id}`);
          break;
        case 'tags':
          if (!this.selectedItems.includes(item)) {
            this.selectedItems.push(item);
          }
          break;
        default:
      }
    },

    /**
     * 移除选中项
     */
    removeSelectedItem(item) {
      this.selectedItems = this.selectedItems.filter(i => i.id !== item.id);
    },

    /**
     * 清空搜索框
     */
    clearHandler() {
      this.keyword = '';
      this.$refs['search-input'].focus();
    },

    enterHandler() {
      if (this.selectedItems.length === 0) {
        if (this.keyword !== '' && this.filteredItems.length !== 0) {
          this.$router.push(`/works?${this.queryField}=${this.filteredItems[0].id}`);
        }

        return;
      }
      this.$router.push(`/works?${this.queryField}=${this.selectedItems.map(item => item.id).join(',')}`);
    },

    /** 设置 selected-items 最大宽度 */
    setSelectedItemsMaxWidth() {
      this.$refs['selected-items'].$el.style.maxWidth = this.$refs['search-input'].$el.clientWidth - 150 + 'px';
    },
  },

  mounted() {
    this.$refs['search-input'].focus();
    this.setSelectedItemsMaxWidth();
    window.addEventListener('resize', this.setSelectedItemsMaxWidth);
  },

  beforeDestroy() {
    window.removeEventListener('resize', this.setSelectedItemsMaxWidth);
  },
};
</script>

<style lang="scss" scoped>
.selected-items {
  display: inline-block;
  padding: 0;
  margin-left: -4px;
  white-space: nowrap;
  overflow-x: auto;

  &::-webkit-scrollbar {
    height: 6px;
    background: transparent;
    border-radius: 8px;
  }
  &::-webkit-scrollbar-thumb {
    background: #b0bec5;
    border-radius: 8px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #90a4ae;
  }
  &::-webkit-scrollbar-button {
    display: none;
    width: 0;
    height: 0;
    background: transparent;
  }
}
.selected-item {
  display: inline-block;
  font-size: 12px;
  border-radius: 16px;
  background-color: #1976d2;
  color: white;
  font-weight: 500;
  white-space: nowrap;
  padding: 4px;
  margin-top: 10px;

  &:not(:first-child) {
    margin-left: 6px;
  }

  & span {
    padding-left: 6px;
  }
}
</style>
