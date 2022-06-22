# xpath helper plus

![](https://miclon-job.oss-cn-hangzhou.aliyuncs.com/img/20220622143923.png)

这是一个xpath开发者的工具，可以帮助开发者快速的定位元素。

其核心API均来自于xpath helper，在此基础上增加了一些额外的功能，比如：精简xpath语句。

#### 精简xpath语句

原来的方式是从根节点，一般是html开始逐一向下进行元素定位，这种方式唯一缺点在于整个xpath语句会很长，比如：

> /html/body/div[@id='__nuxt']/div[@id='__layout']/div[@id='juejin']/div[@class='view-container']/main[@class='container main-container']/div[@class='view column-view']/div[@class='sidebar sidebar top sticky']/div[@class='sticky-block-box']/nav[@class='next-article']/div[@class='next-article-header']/div[@class='next-article-title']

当然还有一部分程序员依赖于chrome自带的元素定位，在选中元素右击-复制xpath，这种方式会很长，而且不可读。

> //*[@id="juejin"]/div[1]/main/div/div[3]/div[4]/nav/div[1]/div

经过精简后的xpath语句，可以很短的，比如：

> //div[@class='next-article-title']

程序会自动查找dom结构中是否该xpath语句是唯一指向元素，如果是，则会自动精简，否则，则会继续向上查找，直到最精简且唯一的xpath语句。


#### 重构

与原有的xpath helper不同的是，这次chrome插件采用Vue3+vite来开发，面向组件进行开发，通过vite打包成chrome插件规范的文件目录结构

#### 安装

clone项目后，进入本项目：
> cd xpath-helper-plus

安装依赖：
> npm install

打包插件：
> npm run build

生成的插件文件在dist目录下，可以直接chrome浏览器中加载此目录。

#### 使用

安装完扩展后，在浏览器右上角会出现本插件的图标，点击后会弹出一个窗口。

姿势1：你可以和xpath helper一样在左侧编辑xpath语句。

姿势2：你也可以按住shift键，鼠标在网页元素中选择定位的元素。



#### 最后

本项目是一个使用vue3+vite开发chrome插件的开端，未来可能会提供更多的功能。或者在此基础上开发其他插件。
