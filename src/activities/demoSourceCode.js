/**
 * Scratch Demo Projects Source Code & XML Definitions
 * Module: VP2_M1L2_3 (Task ID 19097 - Changing looks & Loops)
 */

export const DEMO_SOURCE_CODE = {
  // Level 1: Bear speaks Hello!
  '9097732': {
    projectId: '9097732',
    level: 1,
    title: 'M1L2 – Bear (Demo)',
    spriteName: 'Bear',
    description: 'Khi bấm lá cờ xanh, chú gấu sẽ nói "Hello!" trong vòng 3 giây.',
    steps: [
      { type: 'event', text: 'Khi bấm vào ⚑ (when green flag clicked)' },
      { type: 'looks', text: 'Nói [Hello!] trong (3) giây (say [Hello!] for 3 secs)' }
    ],
    xml: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="event_whenflagclicked" id="b_flag" x="40" y="50">
    <next>
      <block type="looks_sayforsecs" id="b_say">
        <value name="MESSAGE">
          <shadow type="text">
            <field name="TEXT">Hello!</field>
          </shadow>
        </value>
        <value name="SECS">
          <shadow type="math_number">
            <field name="NUM">3</field>
          </shadow>
        </value>
      </block>
    </next>
  </block>
</xml>`
  },

  // Level 2: Snake switches costume
  '10653299': {
    projectId: '10653299',
    level: 2,
    title: 'M1L2 – Snake (Demo)',
    spriteName: 'Snake',
    description: 'Rắn bắt đầu ở trang phục snake-a, đợi 1 giây rồi đổi sang trang phục snake-b.',
    steps: [
      { type: 'event', text: 'Khi bấm vào ⚑ (when green flag clicked)' },
      { type: 'looks', text: 'Đổi trang phục thành [snake-a] (switch costume to snake-a)' },
      { type: 'control', text: 'Đợi (1) giây (wait 1 secs)' },
      { type: 'looks', text: 'Đổi trang phục thành [snake-b] (switch costume to snake-b)' }
    ],
    xml: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="event_whenflagclicked" id="b_flag" x="40" y="50">
    <next>
      <block type="looks_switchcostumeto" id="b_switch1">
        <value name="COSTUME">
          <shadow type="looks_costume">
            <field name="COSTUME">snake-a</field>
          </shadow>
        </value>
        <next>
          <block type="control_wait" id="b_wait">
            <value name="DURATION">
              <shadow type="math_positive_number">
                <field name="NUM">1</field>
              </shadow>
            </value>
            <next>
              <block type="looks_switchcostumeto" id="b_switch2">
                <value name="COSTUME">
                  <shadow type="looks_costume">
                    <field name="COSTUME">snake-b</field>
                  </shadow>
                </value>
              </block>
            </next>
          </block>
        </next>
      </block>
    </next>
  </block>
</xml>`
  },

  // Level 3: Heart beating repeat 4
  '2660241': {
    projectId: '2660241',
    level: 3,
    title: 'M1L2 – Heart beating (Demo)',
    spriteName: 'Heart',
    description: 'Trái tim đập bằng cách lặp lại 4 lần: chuyển sang trang phục kế tiếp và đợi 1 giây.',
    steps: [
      { type: 'event', text: 'Khi bấm vào ⚑ (when green flag clicked)' },
      { type: 'control', text: 'Lặp lại (4) lần (repeat 4 times):' },
      { type: 'looks', text: '  ├─ Trang phục kế tiếp (next costume)' },
      { type: 'control', text: '  └─ Đợi (1) giây (wait 1 secs)' }
    ],
    xml: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="event_whenflagclicked" id="b_flag" x="40" y="50">
    <next>
      <block type="control_repeat" id="b_repeat">
        <value name="TIMES">
          <shadow type="math_whole_number">
            <field name="NUM">4</field>
          </shadow>
        </value>
        <statement name="SUBSTACK">
          <block type="looks_nextcostume" id="b_next">
            <next>
              <block type="control_wait" id="b_wait">
                <value name="DURATION">
                  <shadow type="math_positive_number">
                    <field name="NUM">1</field>
                  </shadow>
                </value>
              </block>
            </next>
          </block>
        </statement>
      </block>
    </next>
  </block>
</xml>`
  },

  // Level 4: Bear walking forever
  '2660096': {
    projectId: '2660096',
    level: 4,
    title: 'M1L2 – Bear walking (Demo)',
    spriteName: 'Bear-walking',
    description: 'Gấu bước đi liên tục bằng vòng lặp liên tục (forever): chuyển sang trang phục kế tiếp và đợi 0.3 giây.',
    steps: [
      { type: 'event', text: 'Khi bấm vào ⚑ (when green flag clicked)' },
      { type: 'control', text: 'Liên tục (forever):' },
      { type: 'looks', text: '  ├─ Trang phục kế tiếp (next costume)' },
      { type: 'control', text: '  └─ Đợi (0.3) giây (wait 0.3 secs)' }
    ],
    xml: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="event_whenflagclicked" id="b_flag" x="40" y="50">
    <next>
      <block type="control_forever" id="b_forever">
        <statement name="SUBSTACK">
          <block type="looks_nextcostume" id="b_next">
            <next>
              <block type="control_wait" id="b_wait">
                <value name="DURATION">
                  <shadow type="math_positive_number">
                    <field name="NUM">0.3</field>
                  </shadow>
                </value>
              </block>
            </next>
          </block>
        </statement>
      </block>
    </next>
  </block>
</xml>`
  },

  // Level 5: Clock backdrop switch
  '2660244': {
    projectId: '2660244',
    level: 5,
    title: 'M1L2 – Clock (Demo)',
    spriteName: 'Stage (Sân khấu)',
    description: 'Đồng hồ chuyển phông nền bắt đầu từ "light", lặp lại 12 lần: đợi 1 giây rồi đổi phông nền kế tiếp.',
    steps: [
      { type: 'event', text: 'Khi bấm vào ⚑ (when green flag clicked)' },
      { type: 'looks', text: 'Đổi phông nền thành [light] (switch backdrop to light)' },
      { type: 'control', text: 'Lặp lại (12) lần (repeat 12 times):' },
      { type: 'control', text: '  ├─ Đợi (1) giây (wait 1 secs)' },
      { type: 'looks', text: '  └─ Phông nền tiếp theo (next backdrop)' }
    ],
    xml: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="event_whenflagclicked" id="b_flag" x="40" y="50">
    <next>
      <block type="looks_switchbackdropto" id="b_switch">
        <value name="BACKDROP">
          <shadow type="looks_backdrops">
            <field name="BACKDROP">light</field>
          </shadow>
        </value>
        <next>
          <block type="control_repeat" id="b_repeat">
            <value name="TIMES">
              <shadow type="math_whole_number">
                <field name="NUM">12</field>
              </shadow>
            </value>
            <statement name="SUBSTACK">
              <block type="control_wait" id="b_wait">
                <value name="DURATION">
                  <shadow type="math_positive_number">
                    <field name="NUM">1</field>
                  </shadow>
                </value>
                <next>
                  <block type="looks_nextbackdrop" id="b_next"/>
                </next>
              </block>
            </statement>
          </block>
        </next>
      </block>
    </next>
  </block>
</xml>`
  },

  // Level 7: Super cat
  'level_7_demo': {
    projectId: 'level_7_demo',
    level: 7,
    title: 'M1L2 – Super cat (Demo)',
    spriteName: 'Sprite1 (Mèo)',
    description: 'Mèo bay: nói "Super Cat!" trong 2 giây rồi liên tục chuyển trang phục mỗi 0.3 giây.',
    steps: [
      { type: 'event', text: 'Khi bấm vào ⚑ (when green flag clicked)' },
      { type: 'looks', text: 'Nói [Super Cat!] trong (2) giây (say [Super Cat!] for 2 secs)' },
      { type: 'control', text: 'Liên tục (forever):' },
      { type: 'looks', text: '  ├─ Trang phục kế tiếp (next costume)' },
      { type: 'control', text: '  └─ Đợi (0.3) giây (wait 0.3 secs)' }
    ],
    xml: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="event_whenflagclicked" id="b_flag" x="40" y="50">
    <next>
      <block type="looks_sayforsecs" id="b_say">
        <value name="MESSAGE">
          <shadow type="text">
            <field name="TEXT">Super Cat!</field>
          </shadow>
        </value>
        <value name="SECS">
          <shadow type="math_number">
            <field name="NUM">2</field>
          </shadow>
        </value>
        <next>
          <block type="control_forever" id="b_forever">
            <statement name="SUBSTACK">
              <block type="looks_nextcostume" id="b_next">
                <next>
                  <block type="control_wait" id="b_wait">
                    <value name="DURATION">
                      <shadow type="math_positive_number">
                        <field name="NUM">0.3</field>
                      </shadow>
                    </value>
                  </block>
                </next>
              </block>
            </statement>
          </block>
        </next>
      </block>
    </next>
  </block>
</xml>`
  },

  // Level 8: Star
  'level_8_demo': {
    projectId: 'level_8_demo',
    level: 8,
    title: 'M1L2 – Flashing star (Demo)',
    spriteName: 'Star1 (Ngôi sao)',
    description: 'Ngôi sao nhấp nháy liên tục: thu nhỏ kích thước (lặp 10 lần -5) rồi phóng to kích thước (lặp 10 lần +5).',
    steps: [
      { type: 'event', text: 'Khi bấm vào ⚑ (when green flag clicked)' },
      { type: 'control', text: 'Liên tục (forever):' },
      { type: 'control', text: '  ├─ Lặp lại (10) lần (repeat 10):' },
      { type: 'looks', text: '  │   ├─ Đổi kích thước một lượng (-5) (change size by -5)' },
      { type: 'control', text: '  │   └─ Đợi (0.1) giây (wait 0.1 secs)' },
      { type: 'control', text: '  └─ Lặp lại (10) lần (repeat 10):' },
      { type: 'looks', text: '      ├─ Đổi kích thước một lượng (5) (change size by 5)' },
      { type: 'control', text: '      └─ Đợi (0.1) giây (wait 0.1 secs)' }
    ],
    xml: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="event_whenflagclicked" id="b_flag" x="40" y="50">
    <next>
      <block type="control_forever" id="b_forever">
        <statement name="SUBSTACK">
          <block type="control_repeat" id="b_rep1">
            <value name="TIMES">
              <shadow type="math_whole_number">
                <field name="NUM">10</field>
              </shadow>
            </value>
            <statement name="SUBSTACK">
              <block type="looks_changesizeby" id="b_dec">
                <value name="CHANGE">
                  <shadow type="math_number">
                    <field name="NUM">-5</field>
                  </shadow>
                </value>
                <next>
                  <block type="control_wait" id="b_wait1">
                    <value name="DURATION">
                      <shadow type="math_positive_number">
                        <field name="NUM">0.1</field>
                      </shadow>
                    </value>
                  </block>
                </next>
              </block>
            </statement>
            <next>
              <block type="control_repeat" id="b_rep2">
                <value name="TIMES">
                  <shadow type="math_whole_number">
                    <field name="NUM">10</field>
                  </shadow>
                </value>
                <statement name="SUBSTACK">
                  <block type="looks_changesizeby" id="b_inc">
                    <value name="CHANGE">
                      <shadow type="math_number">
                        <field name="NUM">5</field>
                      </shadow>
                    </value>
                    <next>
                      <block type="control_wait" id="b_wait2">
                        <value name="DURATION">
                          <shadow type="math_positive_number">
                            <field name="NUM">0.1</field>
                          </shadow>
                        </value>
                      </block>
                    </next>
                  </block>
                </statement>
              </block>
            </next>
          </block>
        </statement>
      </block>
    </next>
  </block>
</xml>`
  },

  // === Task 19846 (M1L3: Where to start?) ===
  '9633740': {
    projectId: '9633740',
    level: 1,
    title: 'M1L3 – Draw a picture (Demo)',
    spriteName: 'Easel',
    description: 'Bức tranh bắt đầu trên một trang giấy trắng (Easel-a), sau đó đổi trang phục liên tục mỗi giây để bức tranh xuất hiện.',
    steps: [
      { type: 'event', text: 'Khi bấm vào ⚑ (when green flag clicked)' },
      { type: 'looks', text: 'Đổi trang phục thành [Easel-a] (switch costume to Easel-a)' },
      { type: 'control', text: 'Lặp lại (3) lần (repeat 3 times):' },
      { type: 'control', text: '  ├─ Đợi (1) giây (wait 1 secs)' },
      { type: 'looks', text: '  └─ Trang phục kế tiếp (next costume)' }
    ]
  },
  '10661509': {
    projectId: '10661509',
    level: 2,
    title: 'M1L3 – Penguin coming from Antarctica (Demo)',
    spriteName: 'Penguin',
    description: 'Chim cánh cụt bắt đầu chuyến đi từ Antarctica, bước đi (đổi trang phục) rồi chuyển cảnh sang phông nền tiếp theo.',
    steps: [
      { type: 'event', text: 'Khi bấm vào ⚑ (when green flag clicked)' },
      { type: 'looks', text: 'Đổi phông nền thành [Antarctica] (switch backdrop to Antarctica)' },
      { type: 'control', text: 'Lặp lại (3) lần (repeat 3 times):' },
      { type: 'control', text: '  ├─ Lặp lại (3) lần:' },
      { type: 'control', text: '  │   ├─ Đợi (0.5) giây' },
      { type: 'looks', text: '  │   └─ Trang phục kế tiếp' },
      { type: 'looks', text: '  └─ Phông nền tiếp theo (next backdrop)' }
    ]
  },
  '10661520': {
    projectId: '10661520',
    level: 3,
    title: 'M1L3 – Disappearing potion (Demo)',
    spriteName: 'Witch',
    description: 'Phù thủy hiện ra lúc bắt đầu, nói muốn uống thuốc độc trong 2 giây rồi biến mất.',
    steps: [
      { type: 'event', text: 'Khi bấm vào ⚑ (when green flag clicked)' },
      { type: 'looks', text: 'Hiện (show)' },
      { type: 'looks', text: 'Nói [I want to drink this potion!] trong (2) giây' },
      { type: 'looks', text: 'Ẩn (hide)' }
    ]
  },
  '10661531': {
    projectId: '10661531',
    level: 4,
    title: 'M1L3 – Sorceress and teacher (Demo)',
    spriteName: 'Wizard',
    description: 'Pháp sư bắt đầu ở kích thước bình thường 100%, nói muốn thử thuốc thu nhỏ trong 2 giây rồi thu nhỏ còn 30%.',
    steps: [
      { type: 'event', text: 'Khi bấm vào ⚑ (when green flag clicked)' },
      { type: 'looks', text: 'Đặt kích thước thành (100) % (set size to 100%)' },
      { type: 'looks', text: 'Nói [Come on, let\'s try your shrinking potion.] trong (2) giây' },
      { type: 'looks', text: 'Đặt kích thước thành (30) % (set size to 30%)' }
    ]
  },
  '6112716': {
    projectId: '6112716',
    level: 5,
    title: 'M1L3 – Balloon (Demo)',
    spriteName: 'Balloon1',
    description: 'Quả bóng ban đầu to (200%), khi ra ngoài trời lạnh bị co nhỏ dần dần.',
    steps: [
      { type: 'event', text: 'Khi bấm vào ⚑ (when green flag clicked)' },
      { type: 'looks', text: 'Đặt kích thước thành (200) % (set size to 200%)' },
      { type: 'control', text: 'Lặp lại (10) lần (repeat 10 times):' },
      { type: 'control', text: '  ├─ Đợi (0.1) giây' },
      { type: 'looks', text: '  └─ Thay đổi kích thước một lượng (-10)' }
    ]
  },
  '9634110': {
    projectId: '9634110',
    level: 7,
    title: 'M1L3 – Pterodactyl (Demo)',
    spriteName: 'Dinosaur3',
    description: 'Thằn lằn bay ban đầu ở xa (kích thước 25%, cánh xòe dinosaur3-b), sau đó bay dần lại gần: to dần và vỗ cánh liên tục.',
    steps: [
      { type: 'event', text: 'Khi bấm vào ⚑ (when green flag clicked)' },
      { type: 'looks', text: 'Đặt kích thước thành (25) %' },
      { type: 'looks', text: 'Đổi trang phục thành [dinosaur3-b]' },
      { type: 'control', text: 'Lặp lại (10) lần (repeat 10 times):' },
      { type: 'control', text: '  ├─ Đợi (0.2) giây' },
      { type: 'looks', text: '  ├─ Thay đổi kích thước một lượng (10)' },
      { type: 'looks', text: '  └─ Trang phục kế tiếp' }
    ]
  },
  '10661609': {
    projectId: '10661609',
    level: 8,
    title: 'M1L3 – Wizard and dog (Demo)',
    spriteName: 'Wizard2 & Dog2',
    description: 'Phù thủy vô tình làm chú chó to khổng lồ rồi tự tàng hình để trốn!',
    steps: [
      { type: 'event', text: 'Sprite Wizard2: Hiện -> Nói [Watch the dog!] (2s) -> Đợi (1s) -> Nói [Oh no, it\'s too big!] (2s) -> Ẩn' },
      { type: 'event', text: 'Sprite Dog2: Đặt kích thước (100)% -> Đợi (2s) -> Lặp lại (10) lần: Thay đổi kích thước (10) & đợi 0.2s' }
    ]
  }
};

DEMO_SOURCE_CODE['level_1_demo'] = DEMO_SOURCE_CODE['9097732'];
DEMO_SOURCE_CODE['level_2_demo'] = DEMO_SOURCE_CODE['10653299'];
DEMO_SOURCE_CODE['level_3_demo'] = DEMO_SOURCE_CODE['2660241'];
DEMO_SOURCE_CODE['level_4_demo'] = DEMO_SOURCE_CODE['2660096'];
DEMO_SOURCE_CODE['level_5_demo'] = DEMO_SOURCE_CODE['2660244'];
