<template>
  <main class="download-page">
    <div class="grid-horizon" aria-hidden="true"></div>
    <div class="orb orb-one" aria-hidden="true"></div>
    <div class="orb orb-two" aria-hidden="true"></div>

    <nav class="topbar" aria-label="页面导航">
      <a class="brand" href="/download" aria-label="全球云智算下载首页">
        <img src="/app-icon.png" alt="" class="brand-icon" />
        <span class="brand-name">全球云智算</span>
      </a>
      <span class="secure-chip">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 4.5 5.3v5.2c0 5 3.2 9.5 7.5 11 4.3-1.5 7.5-6 7.5-11V5.3L12 2Zm3.4 7.5-4.2 4.4-2.5-2.5 1.2-1.2 1.3 1.3 3-3.2 1.2 1.2Z" /></svg>
        官方下载
      </span>
    </nav>

    <section class="hero">
      <div class="hero-copy">
        <div class="eyebrow reveal reveal-1"><span></span> GLOBAL INTELLIGENT COMPUTING</div>
        <h1 class="reveal reveal-2">把算力，装进<br /><strong>你的口袋</strong></h1>
        <p class="lead reveal reveal-3">全球云智算移动端，为你集中管理设备、查看运行状态与收益数据。随时随地，掌握每一份算力。</p>

        <div class="download-panel reveal reveal-4">
          <template v-if="loading">
            <div class="status-block">
              <span class="loader"></span>
              <div><b>正在获取最新版本</b><small>请稍候…</small></div>
            </div>
          </template>

          <template v-else-if="release">
            <div class="version-line">
              <div>
                <span class="android-label">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7.1 5.2-1.4-2.4.8-.5L8 4.8a9.7 9.7 0 0 1 8 0l1.5-2.5.8.5-1.4 2.4A7.7 7.7 0 0 1 20 11H4a7.7 7.7 0 0 1 3.1-5.8ZM8 8.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM4 12h16v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7Z" /></svg>
                  Android 版
                </span>
                <div class="version-name">V{{ release.versionName || '最新版' }}</div>
              </div>
              <div class="file-meta">
                <span>{{ formatSize(release.fileSize) }}</span>
                <span>版本号 {{ release.versionCode }}</span>
              </div>
            </div>

            <a class="download-button" :href="downloadUrl" @click="downloading = true">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 3h2v10.2l3.6-3.6L18 11l-6 6-6-6 1.4-1.4 3.6 3.6V3Zm-6 16h14v2H5v-2Z" /></svg>
              <span>{{ downloading ? '正在开始下载…' : '立即下载 APK' }}</span>
              <small>官方安全版本</small>
            </a>

            <button class="copy-link" type="button" @click="copyDownloadLink">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7V5a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-2v2a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4v-7a4 4 0 0 1 4-4h2Zm2 0h3a4 4 0 0 1 4 4v3h2a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-8a1 1 0 0 0-1 1v2Zm-4 2a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2H6Z" /></svg>
              {{ copied ? '下载链接已复制' : '复制下载链接' }}
            </button>
          </template>

          <template v-else>
            <div class="status-block error-state">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 1 21h22L12 2Zm0 5 7.5 12h-15L12 7Zm-1 3v5h2v-5h-2Zm0 6.5v2h2v-2h-2Z" /></svg>
              <div><b>{{ errorMessage }}</b><small>请稍后刷新页面重试</small></div>
            </div>
            <button class="retry-button" type="button" @click="loadRelease">重新获取</button>
          </template>
        </div>

        <div class="trust-row reveal reveal-5">
          <span><i></i> 官方发布</span>
          <span><i></i> 安全校验</span>
          <span><i></i> 持续更新</span>
        </div>
      </div>

      <div class="visual reveal reveal-3" aria-hidden="true">
        <div class="orbit orbit-one"></div>
        <div class="orbit orbit-two"></div>
        <div class="data-tag tag-one"><span>设备在线</span><b>实时掌握</b></div>
        <div class="data-tag tag-two"><span>收益数据</span><b>清晰可见</b></div>
        <div class="phone-shell">
          <div class="phone-screen">
            <div class="phone-status"><span>9:41</span><span>● ● ●</span></div>
            <div class="mini-brand"><img src="/app-icon.png" alt="" /><span>全球云智算</span></div>
            <p class="hello">智能算力中心</p>
            <h2>每一台设备<br />尽在掌握</h2>
            <div class="compute-card">
              <span>算力运行状态</span>
              <b>稳定运行中</b>
              <div class="bars"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
            </div>
            <div class="mini-stats"><div><span>设备</span><b>集中管理</b></div><div><span>数据</span><b>实时同步</b></div></div>
          </div>
        </div>
      </div>
    </section>

    <section v-if="release" class="release-section">
      <div class="section-heading">
        <span>RELEASE NOTES</span>
        <h2>本次更新</h2>
      </div>
      <div class="release-card">
        <div class="release-version"><span>最新版本</span><b>V{{ release.versionName }}</b><small>{{ formatDate(release.publishedAt) }} 发布</small></div>
        <div class="release-notes">
          <p v-for="(line, index) in releaseNotes" :key="index"><i>{{ String(index + 1).padStart(2, '0') }}</i>{{ line }}</p>
        </div>
      </div>
    </section>

    <section class="steps-section">
      <div class="section-heading light">
        <span>INSTALLATION</span>
        <h2>三步完成安装</h2>
      </div>
      <div class="steps-grid">
        <article><b>01</b><div class="step-icon"><svg viewBox="0 0 24 24"><path d="M11 3h2v10.2l3.6-3.6L18 11l-6 6-6-6 1.4-1.4 3.6 3.6V3Zm-6 16h14v2H5v-2Z" /></svg></div><h3>下载安装包</h3><p>点击上方按钮，下载官方最新版 APK 文件。</p></article>
        <article><b>02</b><div class="step-icon"><svg viewBox="0 0 24 24"><path d="M12 2 4 5.5v6c0 5.1 3.4 9.8 8 10.5 4.6-.7 8-5.4 8-10.5v-6L12 2Zm0 2.2 6 2.6v4.7c0 3.9-2.4 7.6-6 8.4-3.6-.8-6-4.5-6-8.4V6.8l6-2.6Zm-1 4.3v7l5-3.5-5-3.5Z" /></svg></div><h3>允许安装</h3><p>按系统提示，允许浏览器安装来自此来源的应用。</p></article>
        <article><b>03</b><div class="step-icon"><svg viewBox="0 0 24 24"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2Z" /></svg></div><h3>开始使用</h3><p>安装完成后打开 APP，使用管理员开通的账号登录。</p></article>
      </div>
      <p class="compatibility">支持 Android 设备及兼容 Android 应用的鸿蒙设备；暂不支持纯血 HarmonyOS NEXT。</p>
    </section>

    <footer>
      <div><img src="/app-icon.png" alt="" /><span><b>全球云智算</b><small>让算力连接更简单</small></span></div>
      <p>成都联动云芯数字科技有限公司</p>
    </footer>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'

const loading = ref(true)
const release = ref(null)
const errorMessage = ref('暂时没有可下载的版本')
const copied = ref(false)
const downloading = ref(false)

const downloadUrl = computed(() => {
  if (!release.value?.downloadUrl) return '#'
  return new URL(release.value.downloadUrl, window.location.origin).href
})

const releaseNotes = computed(() => {
  const notes = release.value?.releaseNotes?.trim()
  if (!notes) return ['优化应用稳定性与使用体验']
  return notes.split(/\r?\n/).map(line => line.replace(/^[-•\d.、\s]+/, '').trim()).filter(Boolean)
})

const formatSize = (bytes) => {
  if (!bytes) return 'APK'
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(1)} KB`
}

const formatDate = (value) => {
  if (!value) return '近期'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).replace('T', ' ').slice(0, 10)
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).format(date)
}

const loadRelease = async () => {
  loading.value = true
  release.value = null
  try {
    const response = await fetch('/api/app/version/latest?platform=android&currentVersionCode=0', { cache: 'no-store' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const result = await response.json()
    if (result.code !== 200) throw new Error(result.msg || '获取版本失败')
    if (!result.data?.downloadUrl) {
      errorMessage.value = '最新版本正在准备中'
      return
    }
    release.value = result.data
  } catch (error) {
    errorMessage.value = '获取最新版本失败'
  } finally {
    loading.value = false
  }
}

const copyDownloadLink = async () => {
  try {
    await navigator.clipboard.writeText(downloadUrl.value)
  } catch (error) {
    const input = document.createElement('textarea')
    input.value = downloadUrl.value
    input.style.position = 'fixed'
    input.style.opacity = '0'
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    input.remove()
  }
  copied.value = true
  window.setTimeout(() => { copied.value = false }, 2000)
}

onMounted(loadRelease)
</script>

<style scoped>
.download-page {
  --ink: #07162f;
  --navy: #0b2550;
  --blue: #0e7bd4;
  --cyan: #22d3ee;
  --ice: #eaf7ff;
  position: relative;
  min-height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  color: var(--ink);
  background: #f5f9fc;
  font-family: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
}
.grid-horizon { position:absolute; z-index:0; inset:0 0 auto; height:780px; opacity:.22; background-image:linear-gradient(rgba(14,123,212,.13) 1px,transparent 1px),linear-gradient(90deg,rgba(14,123,212,.13) 1px,transparent 1px); background-size:64px 64px; mask-image:linear-gradient(to bottom,#000,transparent 82%); }
.orb { position:absolute; border-radius:50%; filter:blur(1px); pointer-events:none; }
.orb-one { width:480px; height:480px; right:-180px; top:-160px; background:radial-gradient(circle,rgba(34,211,238,.18),transparent 70%); }
.orb-two { width:380px; height:380px; left:-220px; top:400px; background:radial-gradient(circle,rgba(14,123,212,.13),transparent 70%); }
.topbar { position:relative; z-index:5; max-width:1180px; height:88px; margin:auto; padding:0 24px; display:flex; align-items:center; justify-content:space-between; }
.brand { display:flex; align-items:center; gap:12px; color:var(--ink); text-decoration:none; }
.brand-icon { width:42px; height:42px; border-radius:12px; box-shadow:0 8px 24px rgba(14,123,212,.2); }
.brand-name { font-size:19px; font-weight:800; letter-spacing:.08em; }
.secure-chip { display:flex; align-items:center; gap:7px; padding:8px 13px; border:1px solid rgba(14,123,212,.18); border-radius:99px; color:#46617f; background:rgba(255,255,255,.7); backdrop-filter:blur(10px); font-size:13px; }
.secure-chip svg { width:16px; fill:#0e7bd4; }
.hero { position:relative; z-index:1; max-width:1180px; min-height:660px; margin:0 auto; padding:60px 24px 90px; display:grid; grid-template-columns:1.03fr .97fr; align-items:center; gap:70px; }
.eyebrow { display:flex; align-items:center; gap:10px; color:#63809d; font-size:11px; font-weight:700; letter-spacing:.2em; }
.eyebrow span { width:32px; height:2px; background:var(--cyan); }
h1 { margin:20px 0 22px; font-family:"Songti SC","STSong",serif; font-size:clamp(48px,5.8vw,78px); line-height:1.08; letter-spacing:-.055em; font-weight:700; }
h1 strong { position:relative; color:var(--blue); font-weight:800; }
h1 strong::after { content:""; position:absolute; left:3px; right:-4px; bottom:-4px; height:9px; opacity:.5; background:linear-gradient(90deg,var(--cyan),transparent); clip-path:polygon(0 40%,100% 0,98% 72%,2% 100%); }
.lead { max-width:530px; color:#526b86; font-size:16px; line-height:1.9; }
.download-panel { max-width:510px; margin-top:34px; padding:22px; border:1px solid rgba(14,123,212,.15); border-radius:22px; background:rgba(255,255,255,.84); backdrop-filter:blur(18px); box-shadow:0 28px 70px rgba(15,42,92,.1); }
.version-line { display:flex; align-items:end; justify-content:space-between; gap:20px; margin-bottom:18px; }
.android-label { display:flex; align-items:center; gap:6px; color:#63809d; font-size:12px; }
.android-label svg { width:16px; fill:#4da36c; }
.version-name { margin-top:4px; font-size:21px; font-weight:800; letter-spacing:.02em; }
.file-meta { display:flex; flex-direction:column; align-items:end; gap:3px; color:#7b91a7; font-size:11px; }
.download-button { min-height:66px; padding:10px 18px; display:grid; grid-template-columns:34px 1fr; grid-template-rows:1fr 1fr; column-gap:10px; align-items:center; color:#fff; text-decoration:none; border-radius:14px; background:linear-gradient(112deg,#0b62aa,#0e7bd4 62%,#12a7c8); box-shadow:0 14px 30px rgba(14,123,212,.28),inset 0 1px rgba(255,255,255,.25); transition:transform .2s,box-shadow .2s; }
.download-button:hover { transform:translateY(-2px); box-shadow:0 18px 38px rgba(14,123,212,.35),inset 0 1px rgba(255,255,255,.25); }
.download-button svg { grid-row:1/3; width:30px; fill:#fff; }
.download-button span { align-self:end; font-size:17px; font-weight:800; }
.download-button small { align-self:start; opacity:.7; font-size:10px; letter-spacing:.08em; }
.copy-link { width:100%; margin-top:12px; display:flex; justify-content:center; align-items:center; gap:7px; border:0; color:#5f7892; background:transparent; cursor:pointer; font-size:12px; }
.copy-link svg { width:14px; fill:currentColor; }
.status-block { min-height:94px; display:flex; align-items:center; justify-content:center; gap:16px; }
.status-block b,.status-block small { display:block; }
.status-block b { font-size:15px; }.status-block small { margin-top:5px; color:#8194a8; font-size:12px; }
.loader { width:28px; height:28px; border:3px solid #d9eaf6; border-top-color:var(--blue); border-radius:50%; animation:spin .8s linear infinite; }
.error-state svg { width:30px; fill:#f59e0b; }
.retry-button { width:100%; height:42px; border:1px solid #bdd8ec; border-radius:10px; color:var(--blue); background:#f2f9fe; cursor:pointer; }
.trust-row { max-width:510px; margin-top:18px; display:flex; justify-content:center; gap:26px; color:#7a8fa4; font-size:11px; }
.trust-row span { display:flex; align-items:center; gap:6px; }.trust-row i { width:5px; height:5px; border-radius:50%; background:var(--cyan); box-shadow:0 0 0 4px rgba(34,211,238,.1); }
.visual { position:relative; height:560px; display:flex; align-items:center; justify-content:center; }
.orbit { position:absolute; border:1px solid rgba(14,123,212,.15); border-radius:50%; }
.orbit-one { width:470px; height:470px; animation:rotate 24s linear infinite; }.orbit-one::before { content:""; position:absolute; width:10px; height:10px; top:48px; left:78px; border-radius:50%; background:var(--cyan); box-shadow:0 0 20px var(--cyan); }
.orbit-two { width:350px; height:350px; border-style:dashed; animation:rotate 18s linear reverse infinite; }
.phone-shell { position:relative; z-index:2; width:274px; height:548px; padding:9px; border:2px solid #b9d3e6; border-radius:44px; background:linear-gradient(155deg,#e9f7ff,#9cc4df 45%,#eefaff); box-shadow:0 35px 80px rgba(7,22,47,.22),inset 0 0 0 1px #fff; transform:rotate(3deg); }
.phone-shell::before { content:""; position:absolute; z-index:4; top:17px; left:50%; width:72px; height:20px; border-radius:20px; transform:translateX(-50%); background:#07162f; }
.phone-screen { height:100%; overflow:hidden; padding:28px 20px; border-radius:34px; color:#fff; background:radial-gradient(circle at 90% 10%,rgba(34,211,238,.26),transparent 35%),linear-gradient(160deg,#0b2550,#07162f 72%); }
.phone-status { display:flex; justify-content:space-between; opacity:.6; font-size:8px; }
.mini-brand { margin-top:24px; display:flex; align-items:center; gap:7px; font-size:10px; font-weight:700; }.mini-brand img { width:25px; height:25px; border-radius:7px; }
.hello { margin-top:32px; color:#8ab2d8; font-size:10px; letter-spacing:.12em; }.phone-screen h2 { margin-top:7px; font-family:"Songti SC",serif; font-size:28px; line-height:1.35; }
.compute-card { margin-top:28px; padding:17px; border:1px solid rgba(255,255,255,.11); border-radius:17px; background:rgba(255,255,255,.07); box-shadow:inset 0 1px rgba(255,255,255,.08); }.compute-card span { display:block; color:#7fa9cd; font-size:9px; }.compute-card b { display:block; margin-top:5px; color:#58e4ef; font-size:15px; }
.bars { height:46px; margin-top:14px; display:flex; align-items:end; gap:5px; }.bars i { flex:1; border-radius:3px 3px 0 0; background:linear-gradient(#22d3ee,#0e7bd4); animation:pulse 2s ease-in-out infinite; }.bars i:nth-child(1){height:34%}.bars i:nth-child(2){height:58%;animation-delay:.1s}.bars i:nth-child(3){height:45%;animation-delay:.2s}.bars i:nth-child(4){height:85%;animation-delay:.3s}.bars i:nth-child(5){height:65%;animation-delay:.4s}.bars i:nth-child(6){height:96%;animation-delay:.5s}.bars i:nth-child(7){height:74%;animation-delay:.6s}
.mini-stats { margin-top:12px; display:grid; grid-template-columns:1fr 1fr; gap:9px; }.mini-stats div { padding:12px; border-radius:12px; background:rgba(255,255,255,.06); }.mini-stats span,.mini-stats b { display:block; }.mini-stats span { color:#7199bc; font-size:8px; }.mini-stats b { margin-top:4px; font-size:10px; }
.data-tag { position:absolute; z-index:3; min-width:130px; padding:13px 16px; border:1px solid rgba(14,123,212,.17); border-radius:13px; background:rgba(255,255,255,.88); backdrop-filter:blur(12px); box-shadow:0 18px 44px rgba(15,42,92,.12); }.data-tag span,.data-tag b { display:block; }.data-tag span { color:#8ba0b4; font-size:9px; }.data-tag b { margin-top:4px; color:var(--navy); font-size:13px; }.tag-one { top:110px; left:0; }.tag-two { right:-10px; bottom:95px; }
.release-section { position:relative; z-index:2; max-width:1180px; margin:0 auto; padding:90px 24px 110px; }
.section-heading span { color:#0e7bd4; font-size:10px; font-weight:800; letter-spacing:.22em; }.section-heading h2 { margin-top:10px; font-family:"Songti SC",serif; font-size:38px; }
.release-card { margin-top:30px; display:grid; grid-template-columns:260px 1fr; overflow:hidden; border:1px solid #dce9f2; border-radius:20px; background:#fff; box-shadow:0 24px 60px rgba(15,42,92,.07); }
.release-version { padding:34px; display:flex; flex-direction:column; justify-content:center; color:#fff; background:linear-gradient(145deg,#0f2a5c,#0b62aa); }.release-version span { opacity:.65; font-size:11px; }.release-version b { margin:8px 0; font-size:30px; }.release-version small { opacity:.7; font-size:11px; }
.release-notes { padding:30px 38px; display:flex; flex-direction:column; justify-content:center; gap:15px; }.release-notes p { display:flex; align-items:flex-start; gap:15px; color:#4e6780; font-size:14px; line-height:1.7; }.release-notes i { color:#22a6ba; font-style:normal; font-size:11px; font-weight:800; }
.steps-section { position:relative; z-index:1; padding:100px max(24px,calc((100% - 1132px)/2)) 70px; color:#fff; background:#07162f; }
.section-heading.light span { color:#51d6e5; }.section-heading.light h2 { color:#fff; }
.steps-grid { margin-top:38px; display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }.steps-grid article { position:relative; min-height:210px; padding:30px; overflow:hidden; border:1px solid rgba(255,255,255,.1); border-radius:18px; background:rgba(255,255,255,.035); }.steps-grid article>b { position:absolute; right:15px; top:0; color:rgba(255,255,255,.04); font-size:78px; line-height:1; }.step-icon { width:42px; height:42px; display:flex; align-items:center; justify-content:center; border-radius:12px; background:rgba(34,211,238,.1); }.step-icon svg { width:23px; fill:#4de0ea; }.steps-grid h3 { margin-top:24px; font-size:16px; }.steps-grid p { margin-top:10px; color:#8ea5bd; font-size:13px; line-height:1.7; }
.compatibility { margin-top:28px; color:#7088a2; font-size:11px; text-align:center; }
footer { min-height:104px; padding:24px max(24px,calc((100% - 1132px)/2)); display:flex; align-items:center; justify-content:space-between; color:#6d849b; background:#050f22; border-top:1px solid rgba(255,255,255,.06); }footer>div { display:flex; align-items:center; gap:10px; }footer img { width:34px; height:34px; border-radius:9px; }footer span b,footer span small { display:block; }footer span b { color:#d9e7f5; font-size:13px; }footer span small,footer p { margin-top:2px; font-size:10px; }
.reveal { opacity:0; animation:reveal .65s ease forwards; }.reveal-1{animation-delay:.05s}.reveal-2{animation-delay:.12s}.reveal-3{animation-delay:.22s}.reveal-4{animation-delay:.32s}.reveal-5{animation-delay:.42s}
@keyframes reveal { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} } @keyframes spin { to{transform:rotate(360deg)} } @keyframes rotate { to{transform:rotate(360deg)} } @keyframes pulse { 0%,100%{opacity:.5}50%{opacity:1} }
@media (max-width:900px) { .hero { grid-template-columns:1fr; padding-top:35px; text-align:center; }.hero-copy { display:flex; flex-direction:column; align-items:center; }.eyebrow { justify-content:center; }.lead { max-width:600px; }.visual { height:520px; order:2; }.tag-one { left:8%; }.tag-two { right:7%; }.release-section { padding-top:60px; }.release-card { grid-template-columns:210px 1fr; } }
@media (max-width:600px) { .topbar { height:72px; padding:0 18px; }.brand-icon { width:36px;height:36px;border-radius:10px }.brand-name { font-size:16px; }.secure-chip { padding:7px 10px;font-size:11px }.hero { padding:38px 18px 65px; gap:45px; min-height:auto; }.eyebrow { font-size:8px;letter-spacing:.13em }.eyebrow span { width:20px; }h1 { margin-top:16px; font-size:46px; }.lead { font-size:14px; line-height:1.8; }.download-panel { width:100%; margin-top:28px; padding:17px; border-radius:18px; }.version-name { font-size:18px; }.file-meta { font-size:10px; }.download-button { min-height:62px; }.trust-row { width:100%; gap:14px; }.visual { height:445px; transform:scale(.87); margin:-28px 0; }.phone-shell { width:238px;height:475px;border-radius:38px }.phone-screen { border-radius:29px;padding:25px 17px }.phone-screen h2 { font-size:24px }.compute-card { margin-top:20px }.orbit-one { width:390px;height:390px }.orbit-two { width:300px;height:300px }.data-tag { min-width:113px;padding:10px 12px }.tag-one { left:-8px;top:90px }.tag-two { right:-12px;bottom:70px }.release-section { padding:60px 18px 70px; }.section-heading h2 { font-size:31px }.release-card { grid-template-columns:1fr; }.release-version { padding:25px }.release-notes { padding:25px; }.steps-section { padding:70px 18px 50px; }.steps-grid { grid-template-columns:1fr; }.steps-grid article { min-height:190px; }footer { padding:25px 18px; flex-direction:column; gap:18px; text-align:center; } }
@media (prefers-reduced-motion:reduce) { *,*::before,*::after { animation:none!important;transition:none!important }.reveal { opacity:1 } }
</style>
