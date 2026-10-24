import React from 'react';
import H5pPlayerPage from '../../../../pages/H5pPlayerPage';

export default function VP_M2L3_1() {
  const activity = {
    id: "VP_M2L3_1",
    title: "VP Lesson 8 Multiple Choice",
    taskCount: 6,
    h5pPlayUrl: "/courses/VP/M2-Control-Structures/pages/VP_M2L3_1/workspace",
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
