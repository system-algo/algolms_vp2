const removed = {
  "VP2_M1L2_2": [
    "VP2_M1L2_2_15",
    "VP_M1L2_2_15"
  ],
  "VP_M1L2_2": [
    "VP_M1L2_2_15"
  ],
  "VP2_M5L4_3": [
    "VP2_M5L4_3_16",
    "VP_M5L4_3_16"
  ],
  "VP_M5L4_3": [
    "VP_M5L4_3_16"
  ],
  "VP2_M7L2_1": [
    "task-37-qcec2c"
  ],
  "VP2_M7L2_2": [
    "task-37-9q8s3a"
  ],
  "VP2_M7L2_3": [
    "task-37-1frfju6"
  ],
  "VP2_M7L2_4": [
    "VP2_M7L2_4_5"
  ],
  "VP2_M7L2_5": [
    "task-37-aptndm"
  ],
  "VP2_M7L2_6": [
    "task-37-6g642o"
  ],
  "VP2_M7L2_7": [
    "task-37-hpkbau"
  ],
  "VP2_M7L2_8": [
    "task-37-fjt4zs"
  ],
  "VP2_M7L2_9": [
    "task-37-17666u2"
  ],
  "VP2_M7L2_10": [
    "task-37-1buvow0"
  ],
  "VP2_M7L2_11": [
    "task-37-b8og0u"
  ],
  "VP2_M7L2_12": [
    "task-37-1fbd3pk"
  ]
};

export function isRemovedFinishTask(pageId, taskId) {
  return removed[pageId]?.includes(String(taskId)) ?? false;
}

export function isCurrentProgressRecord(record) {
  return !isRemovedFinishTask(record.page_id, record.task_id);
}
