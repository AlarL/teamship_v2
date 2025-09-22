import * as React from 'react';

function useDocumentTitle(title: string): void {
	const originalTitleRef = React.useRef(document.title);

	React.useEffect(() => {
		document.title = title;
	}, [title]);

	React.useEffect(() => {
		const originalTitle = originalTitleRef.current;
		return () => {
			document.title = originalTitle;
		};
	}, []);
}

export default useDocumentTitle;
