
export const toggleExpand = (
    expanded: boolean,
    setExpanded: React.Dispatch<React.SetStateAction<boolean>>,
) => {
    setExpanded(!expanded);
};