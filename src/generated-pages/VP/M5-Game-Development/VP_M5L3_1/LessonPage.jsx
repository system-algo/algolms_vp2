import React from 'react';
import H5pPlayerPage from '../../../../pages/H5pPlayerPage';

export default function VP_M5L3_1() {
  const activity = {
    id: "VP_M5L3_1",
    title: "VP M5L3",
    taskCount: 1,
    h5pPlayUrl: "/courses/VP/M5-Game-Development/pages/VP_M5L3_1/workspace",
    moduleId: "M5-Game-Development",
  };

  return (
    <H5pPlayerPage
      activity={activity}
      courseId="VP"
      onBack={() => window.history.back()}
    />
  );
}
