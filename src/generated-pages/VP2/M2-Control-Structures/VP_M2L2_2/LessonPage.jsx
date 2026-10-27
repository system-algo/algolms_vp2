import React from 'react';
import H5pPlayerPage from '../../../../pages/H5pPlayerPage';

export default function VP_M2L2_2() {
  const activity = {
    id: "VP_M2L2_2",
    title: "VP Lesson 7 Summary",
    taskCount: 1,
    h5pPlayUrl: "/courses/VP/M2-Control-Structures/pages/VP_M2L2_2/workspace",
    moduleId: "M2-Control-Structures",
  };

  return (
    <H5pPlayerPage
      activity={activity}
      courseId="VP"
      onBack={() => window.history.back()}
    />
  );
}
