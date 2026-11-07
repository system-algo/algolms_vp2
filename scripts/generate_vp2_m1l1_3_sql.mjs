import fs from 'node:fs';
import path from 'node:path';

const rawData = {
    "status": "success",
    "data": {
        "id": 18343,
        "title": "Scratch. Let's get acquainted",
        "content": "Scratch 8-12 2019 М1У1 Интерфейс Scratch",
        "lessonId": 8464,
        "type": "regular",
        "display_type": null,
        "isBonus": false,
        "lesson": {
            "id": 8464,
            "title": "M1L1. Linear algorithm English",
            "isMso": false,
            "lockedAt": null,
            "msoSecondsLeft": null
        },
        "levelPosition": null,
        "levels": [
            {
                "id": 187957,
                "position": 1,
                "taskLevelId": 141977,
                "taskLevelType": "regular",
                "type": "scratch",
                "title": "Free programming",
                "levelScore": 1,
                "isAllowFail": false,
                "comics": [],
                "hide": false,
                "skillV2Ids": [],
                "config": {
                    "fail": "",
                    "hint": "",
                    "math": null,
                    "msgs": "",
                    "tips": [],
                    "type": "scratch",
                    "user": 170903,
                    "hints": [
                        {
                            "id": "11bf6ad0-a0d1-42a0-bf33-0f41438dec61",
                            "url": "https://learn.alg.academy/uploads/2021/07/jurassic.gif",
                            "text": "Add a background to your project. Click on the animation above to see how.\nWhen the background is ready, mark the task completed by checking the box and move on to the next task!",
                            "type": "gif",
                            "title": "Add a background"
                        },
                        {
                            "id": "1cc5a7c2-a014-4b9b-b793-53bf84f5338c",
                            "url": "https://learn.alg.academy/uploads/2021/07/dinos.gif",
                            "text": "A sprite is a character that we program in Scratch. Add a sprite, size it, and move it to the desired location.",
                            "type": "gif",
                            "title": "Add sprites",
                            "evaluationType": "markCompleted"
                        },
                        {
                            "id": "a1b379c6-39a0-4b58-b3e6-656f61633a4a",
                            "url": "https://learn.alg.academy/uploads/2021/07/delete sprite.gif",
                            "text": "Click on the x to delete the sprite. If you delete a sprite by accident, click \"Edit\" -> \"Restore Sprite.\"",
                            "type": "gif",
                            "title": "Delete the extra sprite",
                            "evaluationType": "markCompleted"
                        },
                        {
                            "id": "c601e0e9-9982-4699-aa35-6c6b247aec43",
                            "url": "https://learn.alg.academy/uploads/2021/07/saving a project.png",
                            "text": "Click the \"Save\" button to save all the latest changes to the project!",
                            "type": "gif",
                            "title": "Save the project",
                            "evaluationType": "markCompleted"
                        }
                    ],
                    "project": 8908684,
                    "presentation": {
                        "text": "Here are the tasks that need to be completed. To hide this window, click on the purple line to the left of the text.\nTo reopen the tasks, click on the purple line in the upper right corner.\n\nYou can find information about useful buttons in Scratch in the task list below.\nLet's open the first one!",
                        "type": "image",
                        "image": "https://learn.alg.academy/uploads/2021/02/1-3.gif",
                        "title": "Hey! Let's get acquainted with Scratch"
                    }
                }
            },
            {
                "id": 187958,
                "position": 2,
                "taskLevelId": 141978,
                "taskLevelType": "regular",
                "type": "scratch",
                "title": "Let's get acquainted М1Т1 2",
                "levelScore": 1,
                "config": {
                    "hints": [
                        {
                            "id": "2b379473-5b1c-4c96-ab82-4cf53f5ecdee",
                            "url": "https://learn.alg.academy/uploads/2021/07/jurassic_1627549486.gif",
                            "text": "Choose and add a suitable background for these characters!",
                            "type": "gif",
                            "title": "Add a suitable background"
                        },
                        {
                            "id": "11a1dac3-db24-4f8c-a423-7c9f053b1365",
                            "url": "",
                            "text": "",
                            "type": "gif",
                            "title": "Save the project and go to the next level",
                            "evaluationType": "markCompleted"
                        }
                    ],
                    "project": 8910738,
                    "presentation": {
                        "text": "Choose and add a suitable background for these characters! Click on the animation and see how to add a background.",
                        "type": "image",
                        "image": "https://learn.alg.academy/uploads/2021/02/1-3_1613029171.gif",
                        "title": "Add a background"
                    }
                }
            },
            {
                "id": 187959,
                "position": 3,
                "taskLevelId": 141979,
                "type": "scratch",
                "title": "Let's get acquainted М1Т1 3",
                "levelScore": 1,
                "config": {
                    "hints": [
                        {
                            "id": "af1d53af-dfed-4b18-bec0-ad5e3c85999f",
                            "url": "https://learn.alg.academy/uploads/2021/07/jurassic_1627549710.gif",
                            "text": "Choose and add a suitable background for these characters!",
                            "type": "gif",
                            "title": "Add a suitable background"
                        },
                        {
                            "id": "4c4cf8cf-d284-4c54-b5fa-ec8dae440321",
                            "url": "",
                            "text": "",
                            "type": "gif",
                            "title": "Save the project and go to the next level",
                            "evaluationType": "markCompleted"
                        }
                    ],
                    "project": 8910872,
                    "presentation": {
                        "text": "Choose and add a suitable background for these characters!",
                        "type": "image",
                        "image": "https://learn.alg.academy/uploads/2021/02/1-3_1612957339.gif",
                        "title": "Add a background"
                    }
                }
            },
            {
                "id": 187960,
                "position": 4,
                "taskLevelId": 141980,
                "type": "scratch",
                "title": "Let's get acquainted М1Т1 4",
                "levelScore": 1,
                "config": {
                    "hints": [
                        {
                            "id": "e3844aee-06a0-49af-820a-54cf95bdb614",
                            "url": "https://learn.alg.academy/uploads/2021/07/dinos_1627549772.gif",
                            "text": "",
                            "type": "gif",
                            "title": "Add suitable sprites"
                        },
                        {
                            "id": "0985aad7-7a86-476c-a609-6958114ac8b5",
                            "url": "https://learn.alg.academy/uploads/2022/02/спрайт-3.gif",
                            "text": "",
                            "type": "gif",
                            "title": "Move the sprites to suitable places using the mouse"
                        },
                        {
                            "id": "1652e363-274a-4958-bc16-450d3d45a435",
                            "url": "",
                            "text": "",
                            "type": "gif",
                            "title": "Save the project",
                            "evaluationType": "markCompleted"
                        }
                    ],
                    "project": 8910976,
                    "presentation": {
                        "text": "What sprites would look good against this background?",
                        "type": "image",
                        "image": "https://learn.alg.academy/uploads/2021/02/44.gif",
                        "title": "Add suitable sprites"
                    }
                }
            },
            {
                "id": 187961,
                "position": 5,
                "taskLevelId": 141981,
                "type": "scratch",
                "title": "Let's get acquainted М1Т1 5",
                "levelScore": 1,
                "config": {
                    "hints": [
                        {
                            "id": "27b91a14-c70a-4464-8715-0f84a8c7f2c5",
                            "url": "https://learn.alg.academy/uploads/2021/07/dinos_1627554879.gif",
                            "text": "What sprites would look good against this background?",
                            "type": "gif",
                            "title": "Add suitable sprites"
                        },
                        {
                            "id": "2f685368-fc3c-4e1c-9dbc-4a6cf1f041e1",
                            "url": "https://learn.alg.academy/uploads/2021/08/5.png",
                            "text": "",
                            "type": "gif",
                            "title": "Move the sprites to suitable places using the mouse"
                        },
                        {
                            "id": "230ced8a-68be-4679-a57e-4bd028afb080",
                            "url": "",
                            "text": "",
                            "type": "gif",
                            "title": "Save the project",
                            "evaluationType": "markCompleted"
                        }
                    ],
                    "project": 8911069,
                    "presentation": {
                        "text": "What sprites would look good against this background?",
                        "type": "image",
                        "image": "https://learn.alg.academy/uploads/2021/02/44_1612957387.gif",
                        "title": "Add suitable sprites"
                    }
                }
            },
            {
                "id": 187962,
                "position": 6,
                "taskLevelId": 141982,
                "type": "scratch",
                "title": "Let's get acquainted М1Т1 7",
                "levelScore": 1,
                "config": {
                    "hints": [
                        {
                            "id": "7781581d-be21-492b-a73e-5fbda9e97b0d",
                            "url": "https://learn.alg.academy/uploads/2021/07/delete sprite_1627554929.gif",
                            "text": "",
                            "type": "gif",
                            "title": "Delete the extra sprite"
                        },
                        {
                            "id": "f413649b-c78e-46b1-a87c-568c76277b1c",
                            "url": "",
                            "text": "",
                            "type": "gif",
                            "title": "Save the project",
                            "evaluationType": "markCompleted"
                        }
                    ],
                    "project": 8911193,
                    "presentation": {
                        "text": "To delete a sprite, click on the x next to it.",
                        "type": "image",
                        "image": "https://learn.alg.academy/uploads/2021/02/6.gif",
                        "title": "Delete the extra sprite"
                    }
                }
            },
            {
                "id": 187963,
                "position": 7,
                "taskLevelId": 141983,
                "type": "scratch",
                "title": "Let's get acquainted М1Т1 8",
                "levelScore": 1,
                "config": {
                    "hints": [
                        {
                            "id": "fac769b5-e3b9-4495-8462-318b7ca37ce4",
                            "url": "https://learn.alg.academy/uploads/2021/07/delete sprite_1627554966.gif",
                            "text": "",
                            "type": "gif",
                            "title": "Delete the extra sprite"
                        },
                        {
                            "id": "1c53cf71-114f-47c1-bf23-27c7102bb683",
                            "url": "",
                            "text": "",
                            "type": "gif",
                            "title": "Save the project",
                            "evaluationType": "markCompleted"
                        }
                    ],
                    "project": 8911262,
                    "presentation": {
                        "text": "To delete a sprite, click on the x next to it.",
                        "type": "image",
                        "image": "https://learn.alg.academy/uploads/2021/02/6_1612957429.gif",
                        "title": "Delete the extra sprite"
                    }
                }
            },
            {
                "id": 187964,
                "position": 8,
                "taskLevelId": 141984,
                "type": "scratch",
                "title": "Let's get acquainted М1Т1 9",
                "levelScore": 1,
                "config": {
                    "hints": [
                        {
                            "id": "145cbe1f-d59a-4dba-b96b-7529b9cfd19f",
                            "url": "https://learn.alg.academy/uploads/2021/07/backdrop.gif",
                            "text": "",
                            "type": "gif",
                            "title": "Choose a background from those that are available in the project"
                        },
                        {
                            "id": "725e44fd-a994-4ee9-a901-0aea89e3f903",
                            "url": "",
                            "text": "",
                            "type": "gif",
                            "title": "Save the project",
                            "evaluationType": "markCompleted"
                        }
                    ],
                    "project": 25604355,
                    "presentation": {
                        "text": "Please note: there are already a few ready-made backgrounds in the project. You just need to choose the right one.",
                        "type": "image",
                        "image": "https://learn.alg.academy/uploads/2021/02/8_1613029277.gif",
                        "title": "Choose a suitable background"
                    }
                }
            },
            {
                "id": 187965,
                "position": 9,
                "taskLevelId": 141985,
                "type": "scratch",
                "title": "Rating",
                "levelScore": 0,
                "config": {
                    "hints": [
                        { "id": "r1", "title": "Did you like the task?", "text": "Choose how you felt doing this task!" }
                    ],
                    "presentation": {
                        "text": "Great job completing the main tasks! Rate how you feel.",
                        "title": "Awesome work!"
                    }
                }
            },
            {
                "id": 187966,
                "position": 10,
                "taskLevelId": 141986,
                "type": "scratch",
                "title": "Bonus: Mini projects test",
                "levelScore": 1,
                "config": {
                    "hints": [
                        {
                            "id": "dd9fe566-5bc5-4d7e-bc9c-3f0d18ab6ba4",
                            "url": "https://learn.alg.academy/uploads/2021/07/costumes.gif",
                            "text": "",
                            "type": "gif",
                            "title": "Choose the costume you want"
                        },
                        {
                            "id": "0afc6983-7b3e-4a00-aa50-281235c2bfcb",
                            "url": "",
                            "text": "",
                            "type": "gif",
                            "title": "Save the project",
                            "evaluationType": "markCompleted"
                        }
                    ],
                    "project": 8911485,
                    "presentation": {
                        "text": "Let the dog look at you. Can you find the right costume?",
                        "type": "image",
                        "image": "https://learn.alg.academy/uploads/2021/02/star1.gif",
                        "title": "Choose the costume you want"
                    }
                }
            },
            {
                "id": 187967,
                "position": 11,
                "taskLevelId": 141987,
                "type": "scratch",
                "title": "Bonus: Scratch Autocheck",
                "levelScore": 1,
                "config": {
                    "hints": [
                        {
                            "id": "cb32916a-9bbe-49a3-b786-cb54fc415e05",
                            "url": "https://learn.alg.academy/uploads/2021/07/hello.png",
                            "text": "",
                            "type": "gif",
                            "title": "What will your snowman say?",
                            "evaluationType": "markCompleted"
                        },
                        {
                            "id": "5fb28082-4a33-443f-a280-2e90dba0668a",
                            "url": "https://learn.alg.academy/uploads/2021/07/start.png",
                            "text": "The script starts with the command \"When the green flag is clicked.\"",
                            "type": "gif",
                            "title": "The start of the script",
                            "evaluationType": "markCompleted"
                        },
                        {
                            "id": "6b69d30b-792e-48af-9ea5-e1632065ec14",
                            "url": "",
                            "text": "",
                            "type": "gif",
                            "title": "Save the project",
                            "evaluationType": "markCompleted"
                        }
                    ],
                    "project": 8911589,
                    "presentation": {
                        "text": "What will your snowman say?",
                        "type": "image",
                        "image": "https://learn.alg.academy/uploads/2021/07/hello_1626177879.png",
                        "title": "Add a phrase"
                    }
                }
            },
            {
                "id": 187968,
                "position": 12,
                "taskLevelId": 141988,
                "type": "scratch",
                "title": "Bonus: Finish Mars project",
                "levelScore": 1,
                "config": {
                    "hints": [
                        {
                            "id": "41edc7e4-49ff-486d-a05f-208dff1f8d5d",
                            "url": "https://learn.alg.academy/uploads/2021/07/switch backdrop space.png",
                            "text": "",
                            "type": "gif",
                            "title": "Change the background from Earth to Mars"
                        },
                        {
                            "id": "32c87874-dbcb-4168-a597-896d653064b6",
                            "url": "https://learn.alg.academy/uploads/2021/07/hello_1626177970.png",
                            "text": "Use the command \"speak...\"",
                            "type": "gif",
                            "title": "Add a phrase"
                        },
                        {
                            "id": "e7d4bbda-f117-4e9a-b130-31cf6636f52a",
                            "url": "",
                            "text": "",
                            "type": "gif",
                            "title": "Finish the project at your own discretion",
                            "evaluationType": "markCompleted"
                        },
                        {
                            "id": "3fe15b11-bdfb-42be-bc1e-83a473ff6977",
                            "url": "",
                            "text": "",
                            "type": "gif",
                            "title": "Save the project",
                            "evaluationType": "markCompleted"
                        }
                    ],
                    "project": 8911655,
                    "presentation": {
                        "text": "Look, the programmer hasn't completed this project! Finish it.",
                        "type": "scratch",
                        "title": "Finish the Mars project"
                    }
                }
            },
            {
                "id": 187969,
                "position": 13,
                "taskLevelId": 141989,
                "type": "scratch",
                "title": "Final Rating",
                "levelScore": 0,
                "config": {
                    "hints": [
                        { "id": "r2", "title": "Did you like the task?", "text": "Choose how you felt doing this task!" }
                    ],
                    "presentation": {
                        "text": "Congratulations on finishing the lesson!",
                        "title": "Lesson Complete!"
                    }
                }
            }
        ]
    }
};

const levels = rawData.data.levels;
const pageId = 'VP2_M1L1_3';
const courseId = 'VP2';
const moduleNumber = 1;
const moduleTitle = 'Introduction';
const lessonNumber = 1;
const lessonTitle = 'Linear algorithm';

const sqlRows = levels.map((lvl) => {
    const activityId = `${pageId}_${lvl.position}`;
    const levelTitle = lvl.title || `Level ${lvl.position}`;
    const levelType = 'scratch';
    const config = lvl.config || {};
    
    // Requirements / Checklist
    const requirements = (config.hints || []).map((h, i) => {
        let assetUrl = '';
        if (h.url) {
            const ext = path.extname(h.url);
            const base = path.basename(h.url, ext);
            assetUrl = `/vp-assets/18343/${base}.webp`;
        }
        return {
            id: h.id || `req_${i + 1}`,
            title: h.title || '',
            text: h.text || '',
            type: h.type || 'text',
            url: assetUrl
        };
    });

    // Media
    const media = [];
    if (config.presentation?.image) {
        const ext = path.extname(config.presentation.image);
        const base = path.basename(config.presentation.image, ext);
        media.push({
            type: 'presentation',
            title: config.presentation.title || '',
            text: config.presentation.text || '',
            url: `/vp-assets/18343/${base}.webp`
        });
    }

    const starterProjectId = config.project ? String(config.project) : null;
    const commandKeys = ["motion", "looks", "events", "control"];

    return `(
    '${activityId}',
    '${courseId}',
    ${moduleNumber},
    '${moduleTitle.replace(/'/g, "''")}',
    ${lessonNumber},
    '${lessonTitle.replace(/'/g, "''")}',
    ${lvl.position},
    '${levelTitle.replace(/'/g, "''")}',
    '${levelType}',
    '${JSON.stringify(requirements).replace(/'/g, "''")}'::jsonb,
    '${JSON.stringify(media).replace(/'/g, "''")}'::jsonb,
    ${starterProjectId ? `'${starterProjectId}'` : 'NULL'},
    NULL,
    '${JSON.stringify(commandKeys).replace(/'/g, "''")}'::jsonb
)`;
});

const sql = `-- ==============================================================================
-- INSERT ACTIVITIES: MODULE 1 - LESSON 1 - PAGE 3 (Scratch: Let's get acquainted - 13 Levels)
-- Sử dụng đường dẫn ảnh/GIF cục bộ tự host (/vp-assets/18343/...)
-- ==============================================================================
INSERT INTO public.vp_activities (
    activity_id,
    course_id,
    module_number,
    module_title,
    lesson_number,
    lesson_title,
    level_position,
    level_title,
    level_type,
    requirements,
    media,
    starter_project_id,
    demo_project_id,
    command_keys
) VALUES 
${sqlRows.join(',\n')}
ON CONFLICT (activity_id) DO UPDATE SET
    level_title = EXCLUDED.level_title,
    requirements = EXCLUDED.requirements,
    media = EXCLUDED.media,
    starter_project_id = EXCLUDED.starter_project_id,
    command_keys = EXCLUDED.command_keys,
    updated_at = NOW();
`;

fs.writeFileSync('database/vp2_m1l1_3_activities.sql', sql, 'utf8');
console.log('Successfully generated database/vp2_m1l1_3_activities.sql!');
