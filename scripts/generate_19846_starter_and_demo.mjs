import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';

const OUT_DIR = path.resolve('public/starter-projects/19846');
fs.mkdirSync(OUT_DIR, { recursive: true });

function injectBlocksAndSave(starterSb3Name, outName, spriteName, blocksToInject) {
  const starterPath = path.resolve(`public/starter-projects/${starterSb3Name}`);
  const zip = new AdmZip(starterPath);
  const projectJson = JSON.parse(zip.readAsText('project.json'));

  const target = projectJson.targets.find(t => t.name === spriteName);
  if (!target) {
    throw new Error(`Sprite ${spriteName} not found in ${starterSb3Name}`);
  }

  target.blocks = {
    ...target.blocks,
    ...blocksToInject
  };

  zip.updateFile('project.json', Buffer.from(JSON.stringify(projectJson), 'utf8'));
  const outPath = path.join(OUT_DIR, outName);
  zip.writeZip(outPath);
  console.log(` Created ${outName} (${fs.statSync(outPath).size} bytes)`);
}

function copyStarter(starterSb3Name, outName) {
  const starterPath = path.resolve(`public/starter-projects/${starterSb3Name}`);
  const outPath = path.join(OUT_DIR, outName);
  fs.copyFileSync(starterPath, outPath);
  console.log(` Copied starter ${outName}`);
}

async function main() {
  console.log('Generating Task 19846 Starters and Demos...');

  // === LEVEL 1: Draw a picture ===
  copyStarter('M1L3_Drawing_a_picture.sb3', '9633775.sb3');
  copyStarter('M1L3_Drawing_a_picture.sb3', 'level_1.sb3');

  const lvl1Blocks = {
    "b_flag": {
      opcode: "event_whenflagclicked",
      next: "b_switch",
      parent: null,
      inputs: {},
      fields: {},
      shadow: false,
      topLevel: true,
      x: 40,
      y: 50
    },
    "b_switch": {
      opcode: "looks_switchcostumeto",
      next: "b_repeat",
      parent: "b_flag",
      inputs: {
        COSTUME: [1, "b_costume_menu"]
      },
      fields: {},
      shadow: false,
      topLevel: false
    },
    "b_costume_menu": {
      opcode: "looks_costume",
      next: null,
      parent: "b_switch",
      inputs: {},
      fields: {
        COSTUME: ["Easel-a", null]
      },
      shadow: true,
      topLevel: false
    },
    "b_repeat": {
      opcode: "control_repeat",
      next: null,
      parent: "b_switch",
      inputs: {
        TIMES: [1, [6, "3"]],
        SUBSTACK: [2, "b_wait"]
      },
      fields: {},
      shadow: false,
      topLevel: false
    },
    "b_wait": {
      opcode: "control_wait",
      next: "b_next",
      parent: "b_repeat",
      inputs: {
        DURATION: [1, [5, "1"]]
      },
      fields: {},
      shadow: false,
      topLevel: false
    },
    "b_next": {
      opcode: "looks_nextcostume",
      next: null,
      parent: "b_wait",
      inputs: {},
      fields: {},
      shadow: false,
      topLevel: false
    }
  };
  injectBlocksAndSave('M1L3_Drawing_a_picture.sb3', '9633740.sb3', 'Easel', lvl1Blocks);
  injectBlocksAndSave('M1L3_Drawing_a_picture.sb3', 'level_1_demo.sb3', 'Easel', lvl1Blocks);

  // === LEVEL 2: Penguin coming from Antarctica ===
  copyStarter('M1L3_Penguin.sb3', '9633799.sb3');
  copyStarter('M1L3_Penguin.sb3', 'level_2.sb3');

  const lvl2Blocks = {
    "b_flag": {
      opcode: "event_whenflagclicked",
      next: "b_bg",
      parent: null,
      inputs: {},
      fields: {},
      shadow: false,
      topLevel: true,
      x: 40,
      y: 50
    },
    "b_bg": {
      opcode: "looks_switchbackdropto",
      next: "b_repeat_outer",
      parent: "b_flag",
      inputs: {
        BACKDROP: [1, "b_bg_menu"]
      },
      fields: {},
      shadow: false,
      topLevel: false
    },
    "b_bg_menu": {
      opcode: "looks_backdrops",
      next: null,
      parent: "b_bg",
      inputs: {},
      fields: {
        BACKDROP: ["Antarctica", null]
      },
      shadow: true,
      topLevel: false
    },
    "b_repeat_outer": {
      opcode: "control_repeat",
      next: null,
      parent: "b_bg",
      inputs: {
        TIMES: [1, [6, "3"]],
        SUBSTACK: [2, "b_repeat_inner"]
      },
      fields: {},
      shadow: false,
      topLevel: false
    },
    "b_repeat_inner": {
      opcode: "control_repeat",
      next: "b_next_bg",
      parent: "b_repeat_outer",
      inputs: {
        TIMES: [1, [6, "3"]],
        SUBSTACK: [2, "b_wait"]
      },
      fields: {},
      shadow: false,
      topLevel: false
    },
    "b_wait": {
      opcode: "control_wait",
      next: "b_next_costume",
      parent: "b_repeat_inner",
      inputs: {
        DURATION: [1, [5, "0.5"]]
      },
      fields: {},
      shadow: false,
      topLevel: false
    },
    "b_next_costume": {
      opcode: "looks_nextcostume",
      next: null,
      parent: "b_wait",
      inputs: {},
      fields: {},
      shadow: false,
      topLevel: false
    },
    "b_next_bg": {
      opcode: "looks_nextbackdrop",
      next: null,
      parent: "b_repeat_inner",
      inputs: {},
      fields: {},
      shadow: false,
      topLevel: false
    }
  };
  injectBlocksAndSave('M1L3_Penguin.sb3', '10661509.sb3', 'Penguin', lvl2Blocks);
  injectBlocksAndSave('M1L3_Penguin.sb3', 'level_2_demo.sb3', 'Penguin', lvl2Blocks);

  // === LEVEL 3: Disappearing potion ===
  copyStarter('M1L3_Disappearing.sb3', '9633847.sb3');
  copyStarter('M1L3_Disappearing.sb3', 'level_3.sb3');

  const lvl3Blocks = {
    "b_flag": {
      opcode: "event_whenflagclicked",
      next: "b_show",
      parent: null,
      inputs: {},
      fields: {},
      shadow: false,
      topLevel: true,
      x: 40,
      y: 50
    },
    "b_show": {
      opcode: "looks_show",
      next: "b_say",
      parent: "b_flag",
      inputs: {},
      fields: {},
      shadow: false,
      topLevel: false
    },
    "b_say": {
      opcode: "looks_sayforsecs",
      next: "b_hide",
      parent: "b_show",
      inputs: {
        MESSAGE: [1, [10, "I want to drink this potion!"]],
        SECS: [1, [4, "2"]]
      },
      fields: {},
      shadow: false,
      topLevel: false
    },
    "b_hide": {
      opcode: "looks_hide",
      next: null,
      parent: "b_say",
      inputs: {},
      fields: {},
      shadow: false,
      topLevel: false
    }
  };
  injectBlocksAndSave('M1L3_Disappearing.sb3', '10661520.sb3', 'Witch', lvl3Blocks);
  injectBlocksAndSave('M1L3_Disappearing.sb3', 'level_3_demo.sb3', 'Witch', lvl3Blocks);

  // === LEVEL 4: Sorceress and teacher ===
  copyStarter('M1L3_Witch_and_teacher.sb3', '9633998.sb3');
  copyStarter('M1L3_Witch_and_teacher.sb3', 'level_4.sb3');

  const lvl4Blocks = {
    "b_flag": {
      opcode: "event_whenflagclicked",
      next: "b_size100",
      parent: null,
      inputs: {},
      fields: {},
      shadow: false,
      topLevel: true,
      x: 40,
      y: 50
    },
    "b_size100": {
      opcode: "looks_setsizeto",
      next: "b_say",
      parent: "b_flag",
      inputs: {
        SIZE: [1, [4, "100"]]
      },
      fields: {},
      shadow: false,
      topLevel: false
    },
    "b_say": {
      opcode: "looks_sayforsecs",
      next: "b_size30",
      parent: "b_size100",
      inputs: {
        MESSAGE: [1, [10, "Come on, let's try your shrinking potion."]],
        SECS: [1, [4, "2"]]
      },
      fields: {},
      shadow: false,
      topLevel: false
    },
    "b_size30": {
      opcode: "looks_setsizeto",
      next: null,
      parent: "b_say",
      inputs: {
        SIZE: [1, [4, "30"]]
      },
      fields: {},
      shadow: false,
      topLevel: false
    }
  };
  injectBlocksAndSave('M1L3_Witch_and_teacher.sb3', '10661531.sb3', 'Wizard', lvl4Blocks);
  injectBlocksAndSave('M1L3_Witch_and_teacher.sb3', 'level_4_demo.sb3', 'Wizard', lvl4Blocks);

  // === LEVEL 5: Balloon ===
  copyStarter('M1L3_Balloon_on_the_street.sb3', '9634062.sb3');
  copyStarter('M1L3_Balloon_on_the_street.sb3', 'level_5.sb3');

  const lvl5Blocks = {
    "b_flag": {
      opcode: "event_whenflagclicked",
      next: "b_size200",
      parent: null,
      inputs: {},
      fields: {},
      shadow: false,
      topLevel: true,
      x: 40,
      y: 50
    },
    "b_size200": {
      opcode: "looks_setsizeto",
      next: "b_repeat",
      parent: "b_flag",
      inputs: {
        SIZE: [1, [4, "200"]]
      },
      fields: {},
      shadow: false,
      topLevel: false
    },
    "b_repeat": {
      opcode: "control_repeat",
      next: null,
      parent: "b_size200",
      inputs: {
        TIMES: [1, [6, "10"]],
        SUBSTACK: [2, "b_wait"]
      },
      fields: {},
      shadow: false,
      topLevel: false
    },
    "b_wait": {
      opcode: "control_wait",
      next: "b_change",
      parent: "b_repeat",
      inputs: {
        DURATION: [1, [5, "0.1"]]
      },
      fields: {},
      shadow: false,
      topLevel: false
    },
    "b_change": {
      opcode: "looks_changesizeby",
      next: null,
      parent: "b_wait",
      inputs: {
        CHANGE: [1, [4, "-10"]]
      },
      fields: {},
      shadow: false,
      topLevel: false
    }
  };
  injectBlocksAndSave('M1L3_Balloon_on_the_street.sb3', '6112716.sb3', 'Balloon1', lvl5Blocks);
  injectBlocksAndSave('M1L3_Balloon_on_the_street.sb3', 'level_5_demo.sb3', 'Balloon1', lvl5Blocks);

  // === LEVEL 7: Pterodactyl ===
  copyStarter('M1L3_Pterodactyl_is_coming.sb3', '9634094.sb3');
  copyStarter('M1L3_Pterodactyl_is_coming.sb3', 'level_7.sb3');

  const lvl7Blocks = {
    "b_flag": {
      opcode: "event_whenflagclicked",
      next: "b_size25",
      parent: null,
      inputs: {},
      fields: {},
      shadow: false,
      topLevel: true,
      x: 40,
      y: 50
    },
    "b_size25": {
      opcode: "looks_setsizeto",
      next: "b_switch",
      parent: "b_flag",
      inputs: {
        SIZE: [1, [4, "25"]]
      },
      fields: {},
      shadow: false,
      topLevel: false
    },
    "b_switch": {
      opcode: "looks_switchcostumeto",
      next: "b_repeat",
      parent: "b_size25",
      inputs: {
        COSTUME: [1, "b_costume_menu"]
      },
      fields: {},
      shadow: false,
      topLevel: false
    },
    "b_costume_menu": {
      opcode: "looks_costume",
      next: null,
      parent: "b_switch",
      inputs: {},
      fields: {
        COSTUME: ["dinosaur3-b", null]
      },
      shadow: true,
      topLevel: false
    },
    "b_repeat": {
      opcode: "control_repeat",
      next: null,
      parent: "b_switch",
      inputs: {
        TIMES: [1, [6, "10"]],
        SUBSTACK: [2, "b_wait"]
      },
      fields: {},
      shadow: false,
      topLevel: false
    },
    "b_wait": {
      opcode: "control_wait",
      next: "b_change",
      parent: "b_repeat",
      inputs: {
        DURATION: [1, [5, "0.2"]]
      },
      fields: {},
      shadow: false,
      topLevel: false
    },
    "b_change": {
      opcode: "looks_changesizeby",
      next: "b_next",
      parent: "b_wait",
      inputs: {
        CHANGE: [1, [4, "10"]]
      },
      fields: {},
      shadow: false,
      topLevel: false
    },
    "b_next": {
      opcode: "looks_nextcostume",
      next: null,
      parent: "b_change",
      inputs: {},
      fields: {},
      shadow: false,
      topLevel: false
    }
  };
  injectBlocksAndSave('M1L3_Pterodactyl_is_coming.sb3', '9634110.sb3', 'Dinosaur3', lvl7Blocks);
  injectBlocksAndSave('M1L3_Pterodactyl_is_coming.sb3', 'level_7_demo.sb3', 'Dinosaur3', lvl7Blocks);

  // === LEVEL 8: Wizard and dog ===
  copyStarter('M1L3_Hapless_wizard_and_dog.sb3', '9634128.sb3');
  copyStarter('M1L3_Hapless_wizard_and_dog.sb3', 'level_8.sb3');

  const lvl8WizardBlocks = {
    "b_flag": {
      opcode: "event_whenflagclicked",
      next: "b_show",
      parent: null,
      inputs: {},
      fields: {},
      shadow: false,
      topLevel: true,
      x: 40,
      y: 50
    },
    "b_show": {
      opcode: "looks_show",
      next: "b_say1",
      parent: "b_flag",
      inputs: {},
      fields: {},
      shadow: false,
      topLevel: false
    },
    "b_say1": {
      opcode: "looks_sayforsecs",
      next: "b_wait1",
      parent: "b_show",
      inputs: {
        MESSAGE: [1, [10, "Watch the dog!"]],
        SECS: [1, [4, "2"]]
      },
      fields: {},
      shadow: false,
      topLevel: false
    },
    "b_wait1": {
      opcode: "control_wait",
      next: "b_say2",
      parent: "b_say1",
      inputs: {
        DURATION: [1, [5, "1"]]
      },
      fields: {},
      shadow: false,
      topLevel: false
    },
    "b_say2": {
      opcode: "looks_sayforsecs",
      next: "b_hide",
      parent: "b_wait1",
      inputs: {
        MESSAGE: [1, [10, "Oh no, it's too big!"]],
        SECS: [1, [4, "2"]]
      },
      fields: {},
      shadow: false,
      topLevel: false
    },
    "b_hide": {
      opcode: "looks_hide",
      next: null,
      parent: "b_say2",
      inputs: {},
      fields: {},
      shadow: false,
      topLevel: false
    }
  };

  const lvl8DogBlocks = {
    "b_flag": {
      opcode: "event_whenflagclicked",
      next: "b_size100",
      parent: null,
      inputs: {},
      fields: {},
      shadow: false,
      topLevel: true,
      x: 40,
      y: 50
    },
    "b_size100": {
      opcode: "looks_setsizeto",
      next: "b_wait",
      parent: "b_flag",
      inputs: {
        SIZE: [1, [4, "100"]]
      },
      fields: {},
      shadow: false,
      topLevel: false
    },
    "b_wait": {
      opcode: "control_wait",
      next: "b_repeat",
      parent: "b_size100",
      inputs: {
        DURATION: [1, [5, "2"]]
      },
      fields: {},
      shadow: false,
      topLevel: false
    },
    "b_repeat": {
      opcode: "control_repeat",
      next: null,
      parent: "b_wait",
      inputs: {
        TIMES: [1, [6, "10"]],
        SUBSTACK: [2, "b_repeat_wait"]
      },
      fields: {},
      shadow: false,
      topLevel: false
    },
    "b_repeat_wait": {
      opcode: "control_wait",
      next: "b_change",
      parent: "b_repeat",
      inputs: {
        DURATION: [1, [5, "0.2"]]
      },
      fields: {},
      shadow: false,
      topLevel: false
    },
    "b_change": {
      opcode: "looks_changesizeby",
      next: null,
      parent: "b_repeat_wait",
      inputs: {
        CHANGE: [1, [4, "10"]]
      },
      fields: {},
      shadow: false,
      topLevel: false
    }
  };

  // For level 8, both Wizard2 and Dog2 have blocks:
  const starterLvl8 = path.resolve('public/starter-projects/M1L3_Hapless_wizard_and_dog.sb3');
  for (const outName of ['10661609.sb3', 'level_8_demo.sb3']) {
    const zip = new AdmZip(starterLvl8);
    const projectJson = JSON.parse(zip.readAsText('project.json'));
    const wizardTarget = projectJson.targets.find(t => t.name === 'Wizard2');
    if (wizardTarget) wizardTarget.blocks = lvl8WizardBlocks;
    const dogTarget = projectJson.targets.find(t => t.name === 'Dog2');
    if (dogTarget) dogTarget.blocks = lvl8DogBlocks;

    zip.updateFile('project.json', Buffer.from(JSON.stringify(projectJson), 'utf8'));
    const outPath = path.join(OUT_DIR, outName);
    zip.writeZip(outPath);
    console.log(` Created ${outName} (${fs.statSync(outPath).size} bytes)`);
  }

  console.log('Successfully created all starter & demo projects for Task 19846!');
}

main().catch(err => console.error(err));
