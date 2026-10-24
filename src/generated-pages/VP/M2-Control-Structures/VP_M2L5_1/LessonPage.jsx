import React from 'react';
import H5pPlayerPage from '../../../../pages/H5pPlayerPage';

export default function VP_M2L5_1() {
  const activity = {
    id: "VP_M2L5_1",
    title: "VP M2L5_1",
    taskCount: 6,
    h5pPlayUrl: "/courses/VP/M2-Control-Structures/pages/VP_M2L5_1/workspace",
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
