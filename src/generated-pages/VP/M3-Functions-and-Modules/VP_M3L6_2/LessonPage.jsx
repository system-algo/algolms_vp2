import React from 'react';
import H5pPlayerPage from '../../../../pages/H5pPlayerPage';

export default function VP_M3L6_2() {
  const activity = {
    id: "VP_M3L6_2",
    title: "VP M3L6_2",
    taskCount: 1,
    h5pPlayUrl: "/courses/VP/M3-Functions-and-Modules/pages/VP_M3L6_2/workspace",
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
