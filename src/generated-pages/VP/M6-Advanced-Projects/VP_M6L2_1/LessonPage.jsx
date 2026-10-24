import React from 'react';
import H5pPlayerPage from '../../../../pages/H5pPlayerPage';

export default function VP_M6L2_1() {
  const activity = {
    id: "VP_M6L2_1",
    title: "VP M6L2",
    taskCount: 1,
    h5pPlayUrl: "/courses/VP/M6-Advanced-Projects/pages/VP_M6L2_1/workspace",
    moduleId: "M6-Advanced-Projects",
  };

  return (
    <H5pPlayerPage
      activity={activity}
      courseId="VP"
      onBack={() => window.history.back()}
    />
  );
}
