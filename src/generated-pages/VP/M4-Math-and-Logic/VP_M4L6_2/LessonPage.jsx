import React from 'react';
import H5pPlayerPage from '../../../../pages/H5pPlayerPage';

export default function VP_M4L6_2() {
  const activity = {
    id: "VP_M4L6_2",
    title: "VP M4L6_2",
    taskCount: 1,
    h5pPlayUrl: "/courses/VP/M4-Math-and-Logic/pages/VP_M4L6_2/workspace",
    moduleId: "M4-Math-and-Logic",
  };

  return (
    <H5pPlayerPage
      activity={activity}
      courseId="VP"
      onBack={() => window.history.back()}
    />
  );
}
