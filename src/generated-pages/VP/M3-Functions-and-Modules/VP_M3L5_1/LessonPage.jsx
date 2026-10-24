import React from 'react';
import H5pPlayerPage from '../../../../pages/H5pPlayerPage';

export default function VP_M3L5_1() {
  const activity = {
    id: "VP_M3L5_1",
    title: "VP M3L5_1",
    taskCount: 4,
    h5pPlayUrl: "/courses/VP/M3-Functions-and-Modules/pages/VP_M3L5_1/workspace",
    moduleId: "M3-Functions-and-Modules",
  };

  return (
    <H5pPlayerPage
      activity={activity}
      courseId="VP"
      onBack={() => window.history.back()}
    />
  );
}
