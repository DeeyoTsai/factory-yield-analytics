import { useEffect } from "react";

const FmaTextareaElement = ({
  postContent,
  setPostContent,
  line,
  product,
  standardRowNum,
  sortedDfArr,
  sortedRatios,
  smlAvg,
  editable,
  actionArr,
  setActionArr,
  commentDfArr,
  // setCommentDfArr,
}) => {
  useEffect(() => {
    if (!(line === "" || product === "")) {
      setPostContent(
        `<調查結果整理>
    1.${line}-${product}點數超過管制線，進行 ADI review ${String(
      standardRowNum,
    )}枚，平均總點數約${smlAvg}點，結果如下:
    2.主要Defect為
    ${
      commentDfArr && commentDfArr.length >= 1
        ? `(1) ${commentDfArr[0]}   佔${(
            sortedRatios[0]?.toFixed(3) * 100
          ).toFixed(1)}%-->${actionArr[0] || "{action1}"}`
        : `(1) ${sortedDfArr[0]?.trim()}   佔${(
            sortedRatios[0]?.toFixed(3) * 100
          ).toFixed(1)}%-->${actionArr[0] || "{action1}"}`
    }
    ${
      commentDfArr && commentDfArr.length >= 2 && commentDfArr[1] !== ""
        ? `(2) ${commentDfArr[1]}   佔${(
            sortedRatios[1]?.toFixed(3) * 100
          ).toFixed(1)}%-->${actionArr[1] || "{action2}"}`
        : commentDfArr
          ? ""
          : `(2) ${sortedDfArr[1]?.trim()}   佔${(
              sortedRatios[1]?.toFixed(3) * 100
            ).toFixed(1)}%-->${actionArr[1] || "{action2}"}`
    }
    ${
      commentDfArr && commentDfArr.length >= 3 && commentDfArr[2] !== ""
        ? `(3) ${commentDfArr[2]}   佔${(
            sortedRatios[2]?.toFixed(3) * 100
          ).toFixed(1)}%-->${actionArr[2] || "{action3}"}`
        : commentDfArr
          ? ""
          : `(3) ${sortedDfArr[2]?.trim()}   佔${(
              sortedRatios[2]?.toFixed(3) * 100
            ).toFixed(1)}%-->${actionArr[2] || "{action3}"}`
    }        
  `,
      );
    }
  }, [line, product, standardRowNum, sortedDfArr, sortedRatios, smlAvg]);
  // }, [postContent]);

  useEffect(() => {
    // if (postContent.length < 1) {
    if (line === "" || product === "") {
      setPostContent(`<調查結果整理>
  1.{Line}-{Product}點數超過管制線，進行 ADI review 5枚，平均總點數約{Avg.}點，結果如下:
  2.主要Defect為
  (1) {Defect_1}  佔{ratio_1}%-->{action_1}
  (2) {Defect_2}  佔{ratio_2}%-->{action_2}
  (3) {Defect_3}  佔{ratio_3}%-->{action_3}`);
    }
  }, []);

  return (
    <div className="form-floating">
      <textarea
        className="form-control mt-3"
        placeholder="Leave a comment here"
        id="floatingTextarea2"
        style={{ height: "150px" }}
        value={postContent}
        onChange={(e) => {
          const regex = /-->[a-zA-Z\u4E00-\u9FA5]+/g;
          const matchActionsIterator = e.target.value.matchAll(regex);
          // console.log(Array.from(matchActionsIterator));
          setActionArr(
            Array.from(matchActionsIterator).map((e) =>
              e[0]?.slice(3, e[0].length),
            ),
          );
          // console.log(e.target.value);

          setPostContent(e.target.value);
        }}
        disabled={editable}
      >
        {/* {standardRowNum} */}
      </textarea>
      <label htmlFor="floatingTextarea2">Comments</label>
    </div>
  );
};

export default FmaTextareaElement;
