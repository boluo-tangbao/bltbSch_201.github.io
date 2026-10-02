export type Mascot = {
  id: string
  name: string
  file: string
  description: string
  debut: string
}

// “动画初登场”指角色首次出现的动画作品，而非原作出版年份。
export const mascots: Mascot[] = [
  { id: 'miku', name: '初音未来', file: 'pixel-miku-profile.webp', description: '由音乐创作者们共同塑造的虚拟歌手。', debut: '非动画出身 · 歌声合成软件《初音未来》（2007）' },
  { id: 'deepseek', name: 'DeepSeek 娘', file: 'pixel-deepseek-profile.webp', description: '以 DeepSeek 为灵感的社区拟人形象。', debut: '非动画出身 · 无动画初登场' },
  { id: 'akane', name: '黑川茜', file: 'pixel-akane-front.webp', description: '擅长洞察人物、认真投入角色的年轻演员。', debut: '动画初登场：《【我推的孩子】》（2023）' },
  { id: 'utaha', name: '霞之丘诗羽', file: 'pixel-utaha-profile.webp', description: '文笔犀利、外冷内热的轻小说作家。', debut: '动画初登场：《路人女主的养成方法》（2015）' },
  { id: 'yui', name: '由比滨结衣', file: 'pixel-yui-profile.webp', description: '温柔开朗，努力维系侍奉部的关系。', debut: '动画初登场：《我的青春恋爱物语果然有问题。》（2013）' },
  { id: 'ami', name: '川岛亚美', file: 'pixel-ami-profile.webp', description: '外表甜美、性格直率的学生模特。', debut: '动画初登场：《龙与虎》（2008）' },
  { id: 'misaki', name: '食蜂操祈', file: 'pixel-misaki-profile.webp', description: '常盘台的“心理掌握”，举止从容。', debut: '动画初登场：《某科学的超电磁炮S》（2013）' },
  { id: 'sinon', name: '诗乃', file: 'pixel-sinon-profile.webp', description: '在 GGO 中以精准狙击闻名的玩家。', debut: '动画初登场：《刀剑神域Ⅱ》（2014）' },
  { id: 'rin', name: '远坂凛', file: 'pixel-rin-profile.webp', description: '擅长宝石魔术的魔术师与圣杯战争御主。', debut: '动画初登场：《Fate/stay night》（2006）' },
  { id: 'onodera', name: '小野寺小咲', file: 'pixel-onodera-front.webp', description: '害羞温柔、喜欢烘焙的少女。', debut: '动画初登场：《伪恋》（2014）' },
  { id: 'esdeath', name: '艾斯德斯', file: 'pixel-esdeath-profile.webp', description: '拥有冰之帝具、战斗力强大的将军。', debut: '动画初登场：《斩！赤红之瞳》（2014）' },
  { id: 'kumiko', name: '黄前久美子', file: 'pixel-kumiko-profile.webp', description: '吹奏上低音号，逐渐找到自己的音乐目标。', debut: '动画初登场：《吹响吧！上低音号》（2015）' },
  { id: 'aqua', name: '阿库娅', file: 'pixel-aqua-profile.webp', description: '爱哭爱笑的水之女神与冒险同伴。', debut: '动画初登场：《为美好的世界献上祝福！》（2016）' },
  { id: 'emilia', name: '艾米莉亚', file: 'pixel-emilia-profile.webp', description: '善良坚定的半精灵王选候选人。', debut: '动画初登场：《Re:从零开始的异世界生活》（2016）' },
  { id: 'elf', name: '山田妖精', file: 'pixel-elf-profile.webp', description: '自信活泼、喜欢华丽装扮的人气作家。', debut: '动画初登场：《埃罗芒阿老师》（2017）' },
  { id: 'ichinose', name: '一之濑帆波', file: 'pixel-ichinose-front.webp', description: '亲切可靠、凝聚班级同学的领导者。', debut: '动画初登场：《欢迎来到实力至上主义的教室》（2017）' },
  { id: 'mordred', name: '莫德雷德', file: 'pixel-mordred-profile.webp', description: '豪爽好胜、以红之 Saber 身份参战的骑士。', debut: '动画初登场：《Fate/Apocrypha》（2017）' },
  { id: 'hestia', name: '赫斯缇雅', file: 'pixel-hestia-profile.webp', description: '守护眷族、始终支持贝尔的女神。', debut: '动画初登场：《在地下城寻求邂逅是否搞错了什么》（2015）' },
  { id: 'zero-two', name: '02', file: 'pixel-zero-two-profile.webp', description: '拥有红色双角、渴望自由的神秘少女。', debut: '动画初登场：《DARLING in the FRANXX》（2018）' },
  { id: 'eris', name: '艾莉丝', file: 'pixel-eris-profile.webp', description: '性格热烈、不断磨练剑术的大小姐。', debut: '动画初登场：《无职转生》（2021）' },
  { id: 'marin', name: '喜多川海梦', file: 'pixel-marin-profile.webp', description: '热爱 cosplay，坦率表达喜欢的事物。', debut: '动画初登场：《更衣人偶坠入爱河》（2022）' },
  { id: 'mutsumi', name: '若叶睦', file: 'pixel-mutsumi-profile.webp', description: '寡言的吉他手，也是 Ave Mujica 的一员。', debut: '动画初登场：《BanG Dream! It’s MyGO!!!!!》（2023）' },
  { id: 'miuna', name: '潮留美海', file: 'pixel-miuna-front.webp', description: '在海边成长、细腻而坚强的少女。', debut: '动画初登场：《来自风平浪静的明天》（2013）' },
]

export const mascotById = Object.fromEntries(mascots.map(mascot => [mascot.id, mascot])) as Record<string, Mascot>
